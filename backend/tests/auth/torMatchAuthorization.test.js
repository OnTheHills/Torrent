const assert = require("node:assert/strict");
const { test } = require("node:test");
const { getMyTorMatches } = require("@/controllers/tor/torMatchController");
const service = require("@/services/tor/torMatchService");
const { setMyMatchDismissed } = require("@/controllers/tor/torMatchController");
const TORMatch = require("@/models/tor/TORMatch");

test("mine uses the session user rather than client-supplied user IDs", async (t) => {
  const ownMatches = [{ userId: "signed-in-vendor", torId: "tor", matchPercent: 80 }];
  const lookups = [];
  t.mock.method(service, "getTorMatchesByUserId", async (userId) => {
    lookups.push(userId);
    return ownMatches;
  });
  const response = {
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };

  await getMyTorMatches({
    user: { sub: "signed-in-vendor", role: "vendor" },
    query: { userId: "another-vendor" },
    body: { userId: "another-vendor" },
    params: { userId: "another-vendor" },
  }, response);

  assert.deepEqual(lookups, ["signed-in-vendor"]);
  assert.equal(response.code, 200);
  assert.deepEqual(response.body, ownMatches);
});

test("mine feedback cannot change scores, owners, TORs, or another vendor's match", async (t) => {
  const own = { _id: "own-match", userId: "vendor", torId: "official-tor", matchPercent: 80, matchReason: "AI reason" };
  const other = { ...own, _id: "other-match", userId: "other-vendor" };
  const records = [own, other];
  t.mock.method(TORMatch, "findOneAndUpdate", async (filter, update) => {
    const record = records.find((row) => row._id === filter._id && row.userId === filter.userId);
    if (!record) return null;
    Object.assign(record, update.$set);
    return { ...record };
  });
  const response = () => ({
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  });
  for (const feedback of [{ dismissed: true }, { dismissed: false }, { badResult: true }]) {
    const res = response();
    await setMyMatchDismissed({
      user: { sub: "vendor", role: "vendor" }, params: { id: own._id },
      body: { ...feedback, userId: "other-vendor", torId: "forged-tor", matchPercent: 100, matchReason: "Forged" },
    }, res);
    assert.equal(res.code, 200);
    assert.equal(own.userId, "vendor");
    assert.equal(own.torId, "official-tor");
    assert.equal(own.matchPercent, 80);
    assert.equal(own.matchReason, "AI reason");
    if (feedback.badResult) assert.ok(own.badResultAt instanceof Date);
    else assert.equal(Boolean(own.dismissedAt), feedback.dismissed);
  }
  for (const body of [{ dismissed: true }, { badResult: true }]) {
    const res = response();
    await setMyMatchDismissed({
      user: { sub: "vendor", role: "vendor" }, params: { id: other._id }, body,
    }, res);
    assert.equal(res.code, 404);
  }
  assert.equal(other.dismissedAt, undefined);
  assert.equal(other.badResultAt, undefined);
});
