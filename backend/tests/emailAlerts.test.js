const assert = require("node:assert/strict");
const { test } = require("node:test");
const User = require("@/models/User");
const TOR = require("@/models/TOR");
const TORMatch = require("@/models/TORMatch");
const EmailAlert = require("@/models/EmailAlert");
const { matchesPreferences, queueEligibleAlerts, deliverPendingAlerts } = require("@/jobs/emailAlerts");

const query = (value) => ({ select() { return this; }, lean: async () => value });

test("email alerts honor saved filters and create one event per kind", async (t) => {
  const now = new Date("2026-11-12T02:00:00Z");
  const prefs = {
    emailMatches: true, emailDeadlines: true, emailIntegrity: true,
    budgetMinThb: 1_000_000, budgetMaxThb: 20_000_000,
    categories: ["Web Application"], savedAt: new Date("2026-11-11T00:00:00Z"),
  };
  const user = { _id: "user-1", email: "vendor@example.com", emailAlertPrefs: prefs };
  const match = { _id: "match-1", torId: "tor-1", matchPercent: 82, createdAt: new Date("2026-11-12T01:00:00Z") };
  const tor = {
    _id: "tor-1", title: "Public portal", category: "Web Application", budgetThb: 2_000_000,
    deadline: new Date("2026-11-13T09:00:00Z"), integrityStatus: "flagged",
    updatedAt: new Date("2026-11-12T01:00:00Z"),
  };
  const keys = [];
  t.mock.method(User, "find", () => query([user]));
  t.mock.method(TORMatch, "find", () => query([match]));
  t.mock.method(TOR, "find", () => query([tor]));
  t.mock.method(EmailAlert, "updateOne", async (filter, update) => {
    keys.push(filter.key);
    assert.equal(update.$setOnInsert.to, user.email);
  });

  await queueEligibleAlerts(now);
  assert.deepEqual(keys.map((key) => key.split(":")[0]), ["match", "deadline", "integrity"]);
  assert.equal(matchesPreferences({ ...tor, budgetThb: 500_000 }, prefs), false);
  assert.equal(matchesPreferences({ ...tor, category: "GIS" }, prefs), false);
  assert.equal(matchesPreferences({ ...tor, hidden: true }, prefs), false);
});

test("delivery uses a stable idempotency key and marks the email sent", async (t) => {
  const alert = {
    _id: "alert-1", key: "match:user-1:tor-1:match-1", userId: "user-1", torId: "tor-1",
    kind: "match", to: "vendor@example.com", subject: "Match", text: "TOR link", attempts: 1,
  };
  let claimed = false;
  const updates = [];
  t.mock.method(EmailAlert, "findOneAndUpdate", () => query(claimed ? null : (claimed = true, alert)));
  t.mock.method(EmailAlert, "updateOne", async (_filter, update) => updates.push(update.$set));
  t.mock.method(User, "findById", () => query({
    email: alert.to, emailVerified: true, disabled: false,
    emailAlertPrefs: { emailMatches: true, budgetMinThb: 0, budgetMaxThb: 3_000_000, categories: [] },
  }));
  t.mock.method(TOR, "findById", () => query({ _id: "tor-1", budgetThb: 2_000_000, status: "published" }));
  t.mock.method(TORMatch, "findOne", () => query({ matchPercent: 82 }));
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.headers["Idempotency-Key"], alert.key);
    assert.deepEqual(JSON.parse(options.body).to, [alert.to]);
    return { ok: true };
  });
  const oldKey = process.env.RESEND_API_KEY;
  const oldFrom = process.env.EMAIL_FROM;
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "alerts@example.com";
  t.after(() => {
    if (oldKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = oldKey;
    if (oldFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = oldFrom;
  });

  assert.equal(await deliverPendingAlerts(), 1);
  assert.equal(updates[0].status, "sent");
});

test("a queued email is dropped after its recipient turns alerts off", async (t) => {
  const alert = {
    _id: "alert-2", key: "match:user-1:tor-1:match-2", userId: "user-1", torId: "tor-1",
    kind: "match", to: "vendor@example.com", attempts: 1,
  };
  let claimed = false;
  const updates = [];
  t.mock.method(EmailAlert, "findOneAndUpdate", () => query(claimed ? null : (claimed = true, alert)));
  t.mock.method(EmailAlert, "updateOne", async (_filter, update) => updates.push(update.$set));
  t.mock.method(User, "findById", () => query({
    email: alert.to, emailVerified: true, emailAlertPrefs: { emailMatches: false },
  }));
  t.mock.method(TOR, "findById", () => query({ _id: "tor-1", budgetThb: 2_000_000 }));
  t.mock.method(TORMatch, "findOne", () => query({ matchPercent: 82 }));
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Email must not be sent"); });

  assert.equal(await deliverPendingAlerts(), 0);
  assert.equal(updates[0].status, "failed");
});

test("test email sends immediately to the signed-in account with a cooldown", async (t) => {
  const router = require("@/routes/emailAlertRoute");
  const handler = router.stack.find((layer) => layer.route?.path === "/test").route.stack[0].handle;
  const oldKey = process.env.RESEND_API_KEY;
  const oldFrom = process.env.EMAIL_FROM;
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "Torrent <onboarding@resend.dev>";
  t.after(() => {
    if (oldKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = oldKey;
    if (oldFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = oldFrom;
  });
  let claim = true;
  t.mock.method(User, "findOneAndUpdate", () => query(claim ? { _id: "user-1", email: "vendor@example.com" } : null));
  t.mock.method(User, "findById", () => query({ emailVerified: true }));
  let sends = 0;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    sends++;
    assert.deepEqual(JSON.parse(options.body).to, ["vendor@example.com"]);
    return { ok: true };
  });
  const response = () => ({
    code: 200,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  });
  const first = response();
  await handler({ user: { sub: "user-1" } }, first);
  assert.equal(first.code, 200);
  assert.equal(first.body.sent, true);
  claim = false;
  const second = response();
  await handler({ user: { sub: "user-1" } }, second);
  assert.equal(second.code, 429);
  assert.equal(sends, 1);
});
