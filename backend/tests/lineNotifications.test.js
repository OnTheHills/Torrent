const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const { test } = require("node:test");
const lineRepository = require("@/repositories/line/lineRepository");
const torRepository = require("@/repositories/tor/torRepository");
const lineClient = require("@/services/line/lineClient");
const lineService = require("@/services/line/lineService");
const { runLineWeeklyDigest } = require("@/services/line/lineDigestService");
const lineController = require("@/controllers/line/lineController");

test("LINE webhook verifies the raw body and acknowledges valid events", async (t) => {
  const previous = process.env.LINE_CHANNEL_SECRET;
  process.env.LINE_CHANNEL_SECRET = "test-secret";
  t.after(() => {
    if (previous === undefined) delete process.env.LINE_CHANNEL_SECRET;
    else process.env.LINE_CHANNEL_SECRET = previous;
  });
  const body = Buffer.from(JSON.stringify({ events: [{ type: "follow" }] }));
  const signature = createHmac("sha256", "test-secret").update(body).digest("base64");
  const calls = [];
  t.mock.method(lineService, "processWebhookEvents", async (events) => calls.push(events));
  const response = () => ({
    status(code) { this.code = code; return this; },
    json(value) { this.body = value; return this; },
    end() { this.ended = true; return this; },
  });
  const invalid = response();
  lineController.processWebhook({ rawBody: body, get: () => "invalid" }, invalid);
  assert.equal(invalid.code, 401);
  assert.equal(calls.length, 0);
  const valid = response();
  lineController.processWebhook({ rawBody: body, get: () => signature, body: { events: [{ type: "follow" }] } }, valid);
  assert.equal(valid.code, 200);
  assert.equal(valid.ended, true);
  assert.deepEqual(calls, [[{ type: "follow" }]]);
});

test("LINE digest settings reject enabling an unlinked account", async (t) => {
  t.mock.method(lineRepository, "findLineIdByUserId", async () => ({ lineUserId: null }));
  await assert.rejects(lineService.setDigest("user", true), { status: 400 });
  let enabled;
  t.mock.method(lineRepository, "setDigestEnabled", async (_userId, value) => {
    enabled = value;
    return { lineDigestEnabled: value };
  });
  const status = await lineService.setDigest("user", false);
  assert.equal(status.linked, false);
  assert.equal(status.digestEnabled, false);
  assert.equal(enabled, false);
});

test("LINE status, link request, and unlink preserve their response fields", async (t) => {
  const linkedAt = new Date("2026-01-01T00:00:00.000Z");
  t.mock.method(lineRepository, "findStatusByUserId", async () => ({
    lineUserId: "line-user", lineDigestEnabled: true, lineLinkedAt: linkedAt,
  }));
  const status = await lineService.getStatus("user");
  assert.equal(status.linked, true);
  assert.equal(status.digestEnabled, true);
  assert.equal(status.linkedAt, linkedAt);

  let linkArgs;
  t.mock.method(lineRepository, "setLinkCode", async (...args) => {
    linkArgs = args;
    return { lineLinkCode: args[1], lineLinkCodeExpiresAt: args[2] };
  });
  const link = await lineService.startLink("user");
  assert.equal(linkArgs[0], "user");
  assert.match(link.pendingCode, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.ok(link.pendingExpiresAt instanceof Date);
  assert.match(link.instructions, /send this code/);

  t.mock.method(lineRepository, "unlinkUser", async () => ({
    lineDigestEnabled: false, lineLinkedAt: null,
  }));
  const unlinked = await lineService.unlink("user");
  assert.equal(unlinked.linked, false);
  assert.equal(unlinked.digestEnabled, false);
  assert.equal(unlinked.linkedAt, null);
  assert.equal(unlinked.pendingCode, null);
});

test("LINE webhook links a valid code and clears a prior account link", async (t) => {
  const user = { _id: "user", email: "user@example.test", lineLinkCode: "ABC234" };
  const calls = [];
  t.mock.method(lineRepository, "findByValidLinkCode", async (code, now) => {
    assert.equal(code, "ABC234");
    assert.ok(now instanceof Date);
    return user;
  });
  t.mock.method(lineRepository, "clearOtherLineLinks", async (...args) => calls.push(["clear", ...args]));
  t.mock.method(lineRepository, "save", async (saved) => calls.push(["save", saved]));
  t.mock.method(lineClient, "replyText", async (token, message) => calls.push(["reply", token, message]));

  await lineService.processWebhookEvents([{
    type: "message", source: { userId: "line-user" }, replyToken: "reply-token",
    message: { type: "text", text: "link abc234" },
  }]);

  assert.deepEqual(calls[0], ["clear", "line-user", "user"]);
  assert.equal(calls[1][0], "save");
  assert.equal(user.lineUserId, "line-user");
  assert.equal(user.lineDigestEnabled, true);
  assert.ok(user.lineLinkedAt instanceof Date);
  assert.equal(user.lineLinkCode, undefined);
  assert.match(calls[2][2], /เชื่อมบัญชีสำเร็จ/);
});

test("LINE webhook rejects expired codes and clears links on unfollow", async (t) => {
  const calls = [];
  t.mock.method(lineRepository, "findByValidLinkCode", async () => null);
  t.mock.method(lineRepository, "clearLineUserId", async (id) => calls.push(["clear", id]));
  t.mock.method(lineClient, "replyText", async (token, message) => calls.push(["reply", token, message]));

  await lineService.processWebhookEvents([
    { type: "message", source: { userId: "line-user" }, replyToken: "reply-token", message: { type: "text", text: "ABC234" } },
    { type: "unfollow", source: { userId: "line-user" } },
  ]);

  assert.match(calls[0][2], /รหัสไม่ถูกต้องหรือหมดอายุแล้ว/);
  assert.deepEqual(calls[1], ["clear", "line-user"]);
});

test("LINE follow replies distinguish linked and new accounts", async (t) => {
  const replies = [];
  t.mock.method(lineRepository, "findLinkedLineUserId", async () => ({ _id: "user" }));
  t.mock.method(lineClient, "replyText", async (_token, message) => replies.push(message));
  const event = { type: "follow", source: { userId: "line-user" }, replyToken: "reply-token" };
  await lineService.processWebhookEvents([event]);
  assert.match(replies[0], /เชื่อมอยู่แล้ว/);

  lineRepository.findLinkedLineUserId.mock.mockImplementation(async () => null);
  await lineService.processWebhookEvents([event]);
  assert.match(replies[1], /Connect LINE/);
});

test("LINE digest reads TORs and recipients through repositories", async (t) => {
  const previous = process.env.LINE_WEEKLY_DIGEST_ENABLED;
  process.env.LINE_WEEKLY_DIGEST_ENABLED = "true";
  t.after(() => {
    if (previous === undefined) delete process.env.LINE_WEEKLY_DIGEST_ENABLED;
    else process.env.LINE_WEEKLY_DIGEST_ENABLED = previous;
  });
  t.mock.method(lineClient, "getQuota", async () => ({ type: "none" }));
  t.mock.method(torRepository, "findNewTorsSince", async () => [{ _id: "tor", title: "New TOR" }]);
  t.mock.method(lineRepository, "findDigestRecipients", async () => [{ lineUserId: "line-user", email: "user@example.test" }]);
  const sent = [];
  t.mock.method(lineClient, "pushText", async (id, text) => sent.push({ id, text }));

  assert.deepEqual(await runLineWeeklyDigest(), { sent: 1, tors: 1, recipients: 1 });
  assert.equal(sent[0].id, "line-user");
  assert.match(sent[0].text, /New TOR/);
});
