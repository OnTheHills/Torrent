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

  assert.deepEqual(await runEmailAlerts(), { queued: 1, sent: 1 });
  assert.deepEqual(Object.keys(queuedAlert).sort(), ["key", "kind", "torId", "userId"]);
  assert.deepEqual(JSON.parse(request.body).to, ["current@example.test"]);
  assert.match(request.headers["Idempotency-Key"], /^match:user:tor:match:[a-f0-9]{16}$/);
  assert.match(JSON.parse(request.body).subject, /Current project title/);
  assert.equal(updates[0].status, "sent");
});

test("email delivery drops alerts whose source details have changed", async (t) => {
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

  assert.deepEqual(await runEmailAlerts(), { queued: 0, sent: 0 });
  assert.deepEqual(updates.map((update) => update.status), ["failed", "failed"]);
});
