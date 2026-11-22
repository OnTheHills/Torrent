const assert = require("node:assert/strict");
const { test } = require("node:test");
const { getCurrentUser } = require("@/services/auth/authService");
const { toPublicUser } = require("@/utils/publicUser");
const userRepository = require("@/repositories/user/userRepository");
const adminService = require("@/services/admin/adminService");
const { streamTorPdf } = require("@/controllers/admin/adminController");

test("account responses include only fields used by the client", async (t) => {
  const user = {
    _id: "user-id", email: "vendor@example.test", role: "vendor",
    firstname: "Vendor", lastname: "Name", username: "vendor", picture: "https://example.test/p.png",
    googleId: "google-private", lineUserId: "line-private", lineLinkCode: "ABC123",
    emailAlertPrefs: { categories: ["private"] }, sessionVersion: 7,
    passwordHash: "legacy-secret", watchlist: ["private-tor"],
  };
  const expected = {
    _id: user._id, email: user.email, role: user.role,
    firstname: user.firstname, lastname: user.lastname,
    username: user.username, picture: user.picture,
  };
  assert.deepEqual(toPublicUser(user), expected);
  t.mock.method(userRepository, "findPublicById", async (id) => id === user._id ? user : null);
  assert.deepEqual(await getCurrentUser(user._id), expected);
  assert.equal(await getCurrentUser("missing"), null);
});

test("admin PDF responses cannot override the API no-store policy", async (t) => {
  t.mock.method(adminService, "streamTorPdf", async () => ({
    bytes: Buffer.from("pdf"), contentType: "application/pdf", filename: "tor.pdf",
  }));
  const headers = {};
  const response = {
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    send(bytes) { return bytes; },
  };
  assert.deepEqual(await streamTorPdf({ params: { id: "tor-id" } }, response), Buffer.from("pdf"));
  assert.equal(headers["cache-control"], "private, no-store");
});
