const assert = require("node:assert/strict");
const { test } = require("node:test");
const { OAuth2Client } = require("google-auth-library");
const { verifyGoogleIdToken } = require("@/utils/googleAuth");
const auth = require("@/services/auth/authService");

test("Google login verifies audience, issuer, verified email, token type and nonce", async (t) => {
  const previous = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
  t.after(() => previous === undefined ? delete process.env.GOOGLE_CLIENT_ID : process.env.GOOGLE_CLIENT_ID = previous);
  const nonce = "a".repeat(64);
  const valid = {
    sub: "google-user", email: "User@example.test", email_verified: true,
    iss: "https://accounts.google.com", nonce,
  };
  let payload = valid;
  t.mock.method(OAuth2Client.prototype, "verifyIdToken", async (options) => {
    assert.equal(options.audience, process.env.GOOGLE_CLIENT_ID);
    assert.equal(options.idToken, "test-credential");
    return { getPayload: () => payload };
  });
  for (const iss of ["https://accounts.google.com", "accounts.google.com"]) {
    payload = { ...valid, iss };
    assert.equal((await verifyGoogleIdToken("test-credential", { nonce })).email, "user@example.test");
  }
  for (const change of [
    { iss: "https://evil.example" }, { nonce: "wrong-nonce" }, { nonce: undefined },
    { email_verified: false }, { typ: "at+jwt" }, { email: undefined },
  ]) {
    payload = { ...valid, ...change };
    await assert.rejects(verifyGoogleIdToken("test-credential", { nonce }));
  }
});

test("Google auth service rejects missing/invalid transaction nonces before verification", async (t) => {
  t.mock.method(OAuth2Client.prototype, "verifyIdToken", () => assert.fail("Invalid nonce reached Google verification"));
  for (const nonce of [undefined, "", "short", "a".repeat(129), { $ne: null }]) {
    await assert.rejects(auth.loginWithGoogle("credential", undefined, { nonce }),
      (error) => error.statusCode === 401 && error.code === "invalid_nonce");
  }
});
