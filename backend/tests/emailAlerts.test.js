const assert = require("node:assert/strict");
const { test } = require("node:test");
const userRepository = require("@/repositories/user/userRepository");
const torRepository = require("@/repositories/tor/torRepository");
const torMatchRepository = require("@/repositories/tor/torMatchRepository");
const emailAlertRepository = require("@/repositories/email/emailAlertRepository");
const preferences = require("@/services/email/emailAlertService");
const controller = require("@/controllers/email/emailAlertController");
const { runEmailAlerts } = require("@/services/email/alertDeliveryService");
const EmailAlert = require("@/models/email/EmailAlert");

test("email alert ledger needs only references and delivery state", async () => {
  const alert = new EmailAlert({
    key: "match:user:tor:match",
    userId: "507f1f77bcf86cd799439011",
    torId: "507f1f77bcf86cd799439012",
    kind: "match",
  });
  await alert.validate();
  assert.equal(alert.status, "pending");
  assert.equal(alert.recipientHashAlgorithm, "sha256");
  alert.recipientHashAlgorithm = "md5";
  await assert.rejects(alert.validate(), /recipientHashAlgorithm/);
  assert.equal(alert.toObject().to, undefined);
});

test("email controller translates service results and errors to HTTP responses", async (t) => {
  t.mock.method(preferences, "getPreferences", async () => ({ emailMatches: true }));
  t.mock.method(preferences, "savePreferences", async () => {
    throw Object.assign(new Error("Invalid email alert preferences."), { status: 400 });
  });
  const response = () => ({
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  });
  const get = response();
  await controller.getPreferences({ user: { sub: "user" } }, get);
  assert.deepEqual(get.body, { emailMatches: true });
  const save = response();
  await controller.savePreferences({ user: { sub: "user" }, body: {} }, save);
  assert.equal(save.code, 400);
});

test("email preferences validate input and preserve alert start times", async (t) => {
  const since = new Date("2026-01-01T00:00:00Z");
  const current = { emailAlertPrefs: { emailMatches: true, emailIntegrity: false, matchSince: since, savedAt: since } };
  t.mock.method(userRepository, "findEmailAlertPrefsById", async () => current);
  let saved;
  t.mock.method(userRepository, "updateEmailAlertPrefsById", async (_id, prefs) => {
    saved = prefs;
    return { emailAlertPrefs: prefs };
  });

  const input = {
    emailMatches: true, emailDeadlines: false, emailIntegrity: true,
    budgetMinThb: 0, budgetMaxThb: 2_000_000, categories: ["Web Application"],
  };
  await assert.rejects(preferences.savePreferences("user", { ...input, categories: ["invalid"] }), { status: 400 });
  assert.equal(saved, undefined);
  await preferences.savePreferences("user", input);
  assert.equal(saved.matchSince, since);
  assert.notEqual(saved.integritySince, since);
  assert.deepEqual(saved.categories, ["Web Application"]);
});

test("email alerts queue only IDs and send current user and TOR data", async (t) => {
  t.mock.method(torRepository, "findNotificationTors", async () => []);
  for (const [key, value] of Object.entries({ RESEND_API_KEY: "test-key", EMAIL_FROM: "alerts@example.test" })) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }

  const since = new Date("2026-01-01T00:00:00Z");
  const user = {
    _id: "user", email: "current@example.test", emailVerified: true, disabled: false,
    emailAlertPrefs: {
      emailMatches: true, emailDeadlines: false, emailIntegrity: false,
      budgetMinThb: 0, budgetMaxThb: 2_000_000, categories: [],
      matchSince: since, savedAt: since,
    },
  };
  const match = { _id: "match", userId: "user", torId: "tor", matchPercent: 80, createdAt: new Date("2026-02-01T00:00:00Z") };
  const tor = { _id: "tor", title: "Current project title", category: "Web Application", budgetThb: 1_000_000, status: "draft" };
  t.mock.method(userRepository, "findUsersEligibleForEmailAlerts", async () => [user]);
  t.mock.method(userRepository, "findEmailDeliveryUserById", async () => user);
  t.mock.method(torMatchRepository, "findActiveEmailMatchesByUserId", async () => [match]);
  t.mock.method(torMatchRepository, "findActiveEmailMatch", async () => match);
  t.mock.method(torRepository, "findEmailAlertTorsByIds", async () => [tor]);
  t.mock.method(torRepository, "findById", async () => tor);
  let queuedAlert;
  t.mock.method(emailAlertRepository, "queue", async (alert) => {
    queuedAlert = alert;
    return 1;
  });
  let claimed = false;
  t.mock.method(emailAlertRepository, "claimNext", async () => {
    if (claimed) return null;
    claimed = true;
    return { ...queuedAlert, _id: "alert", attempts: 1 };
  });
  const updates = [];
  t.mock.method(emailAlertRepository, "updateSending", async (_id, fields) => updates.push(fields));
  let request;
  t.mock.method(global, "fetch", async (_url, options) => {
    request = options;
    return { ok: true };
  });

  assert.deepEqual(await runEmailAlerts(), { notificationsCreated: 0, queued: 1, sent: 1 });
  assert.deepEqual(Object.keys(queuedAlert).sort(), ["key", "kind", "recipientHashAlgorithm", "torId", "userId"]);
  assert.deepEqual(JSON.parse(request.body).to, ["current@example.test"]);
  assert.match(request.headers["Idempotency-Key"], /^match:user:tor:match:[a-f0-9]{16}$/);
  assert.match(JSON.parse(request.body).subject, /Current project title/);
  assert.equal(updates[0].status, "sent");

  // Newly inserted alerts use the selected algorithm. Retry migration is
  // covered separately with a persistent ledger stub below.
  const keysByAlgorithm = {};
  for (const recipientHashAlgorithm of ["sha256", "sha512"]) {
    for (let retry = 0; retry < 2; retry++) {
      claimed = false;
      assert.equal((await runEmailAlerts({ recipientHashAlgorithm })).sent, 1);
      assert.equal(queuedAlert.recipientHashAlgorithm, recipientHashAlgorithm);
      const key = request.headers["Idempotency-Key"];
      const expected = require("node:crypto").createHash(recipientHashAlgorithm)
        .update(user.email).digest("hex").slice(0, 16);
      assert.equal(key, `${queuedAlert.key}:${expected}`);
      if (retry) assert.equal(key, keysByAlgorithm[recipientHashAlgorithm]);
      keysByAlgorithm[recipientHashAlgorithm] = key;
    }
  }
  assert.notEqual(keysByAlgorithm.sha256, keysByAlgorithm.sha512);
});

test("email retries preserve provider identity across algorithm changes, including legacy rows", async (t) => {
  for (const legacy of [false, true]) {
    await t.test(legacy ? "legacy row without algorithm" : "row with pinned algorithm", async (t) => {
      for (const [key, value] of Object.entries({ RESEND_API_KEY: "test-key", EMAIL_FROM: "alerts@example.test" })) {
        const previous = process.env[key];
        process.env[key] = value;
        t.after(() => {
          if (previous === undefined) delete process.env[key];
          else process.env[key] = previous;
        });
      }
      const since = new Date("2026-01-01T00:00:00Z");
      const user = {
        _id: "user", email: "retry@example.test", emailVerified: true,
        emailAlertPrefs: {
          emailMatches: true, categories: [], budgetMinThb: 0,
          budgetMaxThb: 2_000_000, matchSince: since, savedAt: since,
        },
      };
      const match = { _id: "match", torId: "tor", matchPercent: 80, createdAt: new Date("2026-02-01T00:00:00Z") };
      const tor = { _id: "tor", title: "Retry project", category: "Web Application", budgetThb: 1_000_000, status: "draft" };
      t.mock.method(torRepository, "findNotificationTors", async () => []);
      t.mock.method(userRepository, "findUsersEligibleForEmailAlerts", async () => [user]);
      t.mock.method(userRepository, "findEmailDeliveryUserById", async () => user);
      t.mock.method(torMatchRepository, "findActiveEmailMatchesByUserId", async () => [match]);
      t.mock.method(torMatchRepository, "findActiveEmailMatch", async () => match);
      t.mock.method(torRepository, "findEmailAlertTorsByIds", async () => [tor]);
      t.mock.method(torRepository, "findById", async () => tor);
      const ledger = new Map();
      // Model the real repository's unique key and $setOnInsert semantics.
      t.mock.method(emailAlertRepository, "queue", async (alert) => {
        if (ledger.has(alert.key)) return 0;
        const stored = { ...alert, _id: "alert", attempts: 1, status: "pending" };
        if (legacy) delete stored.recipientHashAlgorithm;
        ledger.set(alert.key, stored);
        return 1;
      });
      let claimed = false;
      t.mock.method(emailAlertRepository, "claimNext", async () => {
        if (claimed) return null;
        claimed = true;
        const stored = [...ledger.values()].find((alert) => alert.status === "pending");
        if (!stored) return null;
        stored.status = "sending";
        return { ...stored };
      });
      t.mock.method(emailAlertRepository, "updateSending", async (_id, fields) => {
        Object.assign([...ledger.values()][0], fields);
      });
      t.mock.method(console, "error", () => {});
      const requests = [];
      const providerAccepted = new Set();
      t.mock.method(global, "fetch", async (_url, options) => {
        requests.push(options);
        providerAccepted.add(options.headers["Idempotency-Key"]);
        // Provider accepted the first message, but the client lost the response.
        if (requests.length === 1) throw new Error("Response lost after provider acceptance");
        return { ok: true };
      });
      assert.deepEqual(await runEmailAlerts({ recipientHashAlgorithm: "sha256" }), {
        notificationsCreated: 0, queued: 1, sent: 0,
      });
      claimed = false;
      assert.deepEqual(await runEmailAlerts({ recipientHashAlgorithm: "sha512" }), {
        notificationsCreated: 0, queued: 0, sent: 1,
      });
      assert.equal(ledger.size, 1);
      assert.equal(requests.length, 2);
      assert.equal(providerAccepted.size, 1);
      assert.equal(requests[0].headers["Idempotency-Key"], requests[1].headers["Idempotency-Key"]);
      assert.equal(requests[0].body, requests[1].body);
      const expected = require("node:crypto").createHash("sha256").update(user.email).digest("hex").slice(0, 16);
      assert.equal(requests[1].headers["Idempotency-Key"], `match:user:tor:match:${expected}`);
    });
  }
});

test("closing-soon email sends for an opted-in match and is queued only once", async (t) => {
  t.mock.method(torRepository, "findNotificationTors", async () => []);
  for (const [key, value] of Object.entries({ RESEND_API_KEY: "test-key", EMAIL_FROM: "alerts@example.test" })) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }

  const user = {
    _id: "user", email: "vendor@example.test", emailVerified: true, disabled: false,
    emailAlertPrefs: {
      emailMatches: false, emailDeadlines: true, emailIntegrity: false,
      budgetMinThb: 0, budgetMaxThb: 2_000_000, categories: ["Web Application"],
      savedAt: new Date(),
    },
  };
  const match = { _id: "match", userId: "user", torId: "tor", matchPercent: 80, createdAt: new Date(0) };
  const tor = {
    _id: "tor", title: "Closing project", category: "Web Application",
    budgetThb: 1_000_000, status: "draft",
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  };
  t.mock.method(userRepository, "findUsersEligibleForEmailAlerts", async () => [user]);
  t.mock.method(userRepository, "findEmailDeliveryUserById", async () => user);
  t.mock.method(torMatchRepository, "findActiveEmailMatchesByUserId", async () => [match]);
  t.mock.method(torMatchRepository, "findActiveEmailMatch", async () => match);
  t.mock.method(torRepository, "findEmailAlertTorsByIds", async () => [tor]);
  t.mock.method(torRepository, "findById", async () => tor);
  const keys = new Set();
  const pending = [];
  t.mock.method(emailAlertRepository, "queue", async (alert) => {
    if (keys.has(alert.key)) return 0;
    keys.add(alert.key);
    pending.push({ ...alert, _id: "alert", attempts: 1 });
    return 1;
  });
  t.mock.method(emailAlertRepository, "claimNext", async () => pending.shift() || null);
  const updates = [];
  t.mock.method(emailAlertRepository, "updateSending", async (_id, fields) => updates.push(fields));
  const requests = [];
  t.mock.method(global, "fetch", async (_url, options) => {
    requests.push(options);
    return { ok: true };
  });

  assert.deepEqual(await runEmailAlerts(), { notificationsCreated: 0, queued: 1, sent: 1 });
  assert.equal(keys.size, 1);
  assert.match([...keys][0], /^deadline:user:tor:\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(JSON.parse(requests[0].body).to, ["vendor@example.test"]);
  assert.match(JSON.parse(requests[0].body).subject, /deadline approaching: Closing project/);
  assert.equal(updates[0].status, "sent");
  assert.deepEqual(await runEmailAlerts(), { notificationsCreated: 0, queued: 0, sent: 0 });
  assert.equal(requests.length, 1);

  tor.deadline = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
  assert.deepEqual(await runEmailAlerts(), { notificationsCreated: 0, queued: 0, sent: 0 });
  user.emailAlertPrefs.emailDeadlines = false;
  tor.deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  assert.deepEqual(await runEmailAlerts(), { notificationsCreated: 0, queued: 0, sent: 0 });
});

test("email delivery drops alerts whose source details have changed", async (t) => {
  t.mock.method(torRepository, "findNotificationTors", async () => []);
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.EMAIL_FROM;
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "alerts@example.test";
  t.after(() => {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previousFrom;
  });

  t.mock.method(userRepository, "findUsersEligibleForEmailAlerts", async () => []);
  t.mock.method(userRepository, "findEmailDeliveryUserById", async () => ({
    email: "user@example.test", emailVerified: true,
    emailAlertPrefs: {
      emailDeadlines: true, emailIntegrity: true, categories: [],
      budgetMinThb: 0, budgetMaxThb: 2_000_000,
    },
  }));
  const tor = {
    _id: "tor", status: "draft", budgetThb: 1_000_000,
    deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    integrityStatus: "flagged",
  };
  t.mock.method(torRepository, "findById", async () => tor);
  t.mock.method(torMatchRepository, "findActiveEmailMatch", async () => ({ matchPercent: 80 }));
  const alerts = [
    { _id: "deadline", userId: "user", torId: "tor", kind: "deadline", key: "deadline:user:tor:old-date" },
    { _id: "integrity", userId: "user", torId: "tor", kind: "integrity", key: "integrity:user:tor:confirmed" },
  ];
  t.mock.method(emailAlertRepository, "claimNext", async () => alerts.shift() || null);
  const updates = [];
  t.mock.method(emailAlertRepository, "updateSending", async (_id, fields) => updates.push(fields));
  t.mock.method(global, "fetch", async () => { throw new Error("Stale alert was sent"); });

  assert.deepEqual(await runEmailAlerts(), { notificationsCreated: 0, queued: 0, sent: 0 });
  assert.deepEqual(updates.map((update) => update.status), ["failed", "failed"]);
});
