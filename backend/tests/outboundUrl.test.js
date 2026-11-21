const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  assertSafeOutboundUrl,
  hostAllowed,
  isPrivateIp,
} = require("../src/utils/outboundUrl");
const { safeAppPath } = require("../src/utils/safePath");
const {
  signUserToken,
  verifyUserToken,
  SESSION_TOKEN_TYP,
  sessionAudience,
} = require("../src/utils/session");

test("outbound URL allowlist rejects private and foreign hosts", () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "outbound-url-test-secret";
  assert.equal(hostAllowed("process3.gprocurement.go.th"), true);
  assert.equal(hostAllowed("evil.example.com"), false);
  assert.equal(isPrivateIp("10.0.0.1"), true);
  assert.equal(isPrivateIp("8.8.8.8"), false);

  assert.throws(
    () => assertSafeOutboundUrl("https://169.254.169.254/latest/meta-data/", { label: "PDF" }),
    /private|allowlisted|invalid/i,
  );
  assert.throws(
    () => assertSafeOutboundUrl("file:///etc/passwd", { label: "PDF" }),
    /http/i,
  );
  const ok = assertSafeOutboundUrl("https://process3.gprocurement.go.th/path.pdf", {
    label: "PDF",
  });
  assert.match(ok, /^https:\/\/process3\.gprocurement\.go\.th\//);
});

test("safeAppPath blocks open redirects", () => {
  assert.equal(safeAppPath("/app/home"), "/app/home");
  assert.equal(safeAppPath("//evil.example/phish"), "/");
  assert.equal(safeAppPath("https://evil.example/phish"), "/");
  assert.equal(safeAppPath("/\\evil"), "/");
});

test("session JWTs carry audience and session typ; wrong typ is rejected", () => {
  process.env.JWT_SECRET = "session-typ-test-secret";
  const token = signUserToken({
    _id: "507f1f77bcf86cd799439011",
    role: "vendor",
    email: "vendor@example.test",
    sessionVersion: 0,
  });
  const claims = verifyUserToken(token);
  assert.equal(claims.typ, SESSION_TOKEN_TYP);
  assert.equal(claims.aud, sessionAudience());
  assert.ok(claims.exp > claims.iat);

  const jwt = require("jsonwebtoken");
  const forged = jwt.sign(
    {
      sub: "507f1f77bcf86cd799439011",
      role: "admin",
      email: "vendor@example.test",
      sv: 0,
      jti: "x",
      typ: "id_token",
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h", audience: sessionAudience() },
  );
  assert.throws(() => verifyUserToken(forged), /type|invalid/i);
});
