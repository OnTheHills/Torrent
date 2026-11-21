const assert = require("node:assert/strict");
const { test } = require("node:test");
const { getMyTorMatches } = require("@/controllers/tor/torMatchController");
const service = require("@/services/tor/torMatchService");

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
