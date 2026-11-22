const assert = require("node:assert/strict");
const { test } = require("node:test");

const USER_ID = "507f1f77bcf86cd799439011";
const storedUser = {
  _id: USER_ID,
  email: "vendor@example.test",
  role: "vendor",
  firstname: "Test",
  lastname: "Vendor",
  username: "vendor",
  picture: "https://example.test/avatar.png",
  googleId: "google-private-id",
  lineUserId: "line-private-id",
  lineLinkCode: "PRIVATE-CODE",
  lineLinkCodeExpiresAt: new Date(),
  emailAlertPrefs: { emailMatches: true },
  sessionVersion: 7,
  passwordHash: "private-hash",
};
const expectedPublicUser = {
  _id: USER_ID,
  email: "vendor@example.test",
  role: "vendor",
  firstname: "Test",
  lastname: "Vendor",
  username: "vendor",
  picture: "https://example.test/avatar.png",
};

test("current-user API shapes auth data and omits provider, LINE, and session secrets", async (t) => {
  const repository = require("../../src/repositories/user/userRepository");
  t.mock.method(repository, "findPublicById", async () => storedUser);

  const user = await require("../../src/services/auth/authService").getCurrentUser(USER_ID);
  assert.deepEqual(user, expectedPublicUser);
});

test("generic user endpoint returns only the client identity fields", async (t) => {
  const service = require("../../src/services/user/userService");
  t.mock.method(service, "getUserById", async () => storedUser);
  const controller = require("../../src/controllers/user/userController");
  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  await controller.getUserById({ params: { id: USER_ID } }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, expectedPublicUser);
});

test("account deletion removes a linked vendor profile before the account", async (t) => {
  const calls = [];
  const profiles = require("../../src/services/vendor/vendorProfileService");
  const users = require("../../src/repositories/user/userRepository");
  t.mock.method(profiles, "getVendorProfileByUserId", async () => ({ _id: "profile-id" }));
  t.mock.method(profiles, "deleteVendorProfile", async (id) => { calls.push(`profile:${id}`); });
  t.mock.method(users, "remove", async (id) => { calls.push(`user:${id}`); return storedUser; });

  const deleted = await require("../../src/services/user/userService").deleteUser(USER_ID);
  assert.equal(deleted, storedUser);
  assert.deepEqual(calls, ["profile:profile-id", `user:${USER_ID}`]);
});
