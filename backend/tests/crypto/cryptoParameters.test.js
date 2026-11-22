const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createHmac } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const jwt = require("jsonwebtoken");
const { hashHex, verifyHmac } = require("@/utils/cryptoAlgorithms");

// Exercise real service code with synthetic keys, without environment changes.
function loadService(relativePath, sessionAlgorithm) {
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(path.join(__dirname, "../../src", relativePath), "utf8"), {
    module, Buffer, console, process: { env: {} },
    require(name) {
      if (name === "@/config/secrets") return { readSecret: () => "synthetic-crypto-parameter-test-key" };
      if (name === "@/utils/cryptoAlgorithms" && sessionAlgorithm) {
        return { ...require(name), DEFAULT_SESSION_ALGORITHM: sessionAlgorithm };
      }
      return require(name);
    },
  });
  return module.exports;
}

test("hash parameter selects SHA-256 or SHA-512 with independent known answers", () => {
  assert.equal(hashHex("abc", { algorithm: "sha256" }), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(hashHex("abc", { algorithm: "sha512" }), "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f");
  assert.throws(() => hashHex("abc", { algorithm: "md5" }), /Unsupported/);
});

test("HMAC parameter upgrades both peers; mismatches and altered payloads fail closed", () => {
  const line = loadService("services/line/lineService.js");
  const body = Buffer.from('{"events":[]}');
  const secret = "synthetic-crypto-parameter-test-key";
  for (const algorithm of ["sha256", "sha384", "sha512"]) {
    const signature = createHmac(algorithm, secret).update(body).digest("base64");
    assert.equal(line.verifySignature(body, signature, { algorithm }), true);
    assert.equal(line.verifySignature(Buffer.from("altered"), signature, { algorithm }), false);
    assert.equal(line.verifySignature(body, signature, { algorithm: algorithm === "sha512" ? "sha256" : "sha512" }), false);
  }
  assert.equal(verifyHmac(body, "", secret), false);
  assert.throws(() => line.verifySignature(body, "signature", { algorithm: "md5" }), /Unsupported/);
});

test("JWT verification accepts only the current algorithm and rejects retired sessions", () => {
  const session = loadService("utils/session.js", "HS256");
  const upgraded = loadService("utils/session.js", "HS512");
  const user = { _id: "test-user", role: "vendor", email: "vendor@example.test" };
  const oldToken = session.signUserToken(user);
  const newToken = upgraded.signUserToken(user);
  assert.equal(jwt.decode(oldToken, { complete: true }).header.alg, "HS256");
  assert.equal(jwt.decode(newToken, { complete: true }).header.alg, "HS512");
  assert.equal(session.verifyUserToken(oldToken).sub, user._id);
  assert.throws(() => session.verifyUserToken(newToken), /invalid algorithm/);
  assert.throws(() => upgraded.verifyUserToken(oldToken), /invalid algorithm/);
  assert.equal(upgraded.verifyUserToken(newToken).sub, user._id);
  const otherToken = session.signUserToken(user, { algorithm: "HS384" });
  assert.throws(() => session.verifyUserToken(otherToken), /invalid algorithm/);
  assert.throws(() => upgraded.verifyUserToken(otherToken), /invalid algorithm/);
  assert.equal(session.verifyUserToken(newToken, { algorithm: "HS512" }).sub, user._id);
  assert.throws(() => session.signUserToken(user, { algorithm: "none" }), /Unsupported/);
  assert.throws(() => session.verifyUserToken(newToken, { algorithm: "none" }), /Unsupported/);
  const unsigned = jwt.sign({ sub: user._id }, "", { algorithm: "none" });
  assert.throws(() => session.verifyUserToken(unsigned), /signature is required/);
});

test("email rejects unsupported hash configuration before queue or provider activity", async () => {
  const { runEmailAlerts } = require("@/services/email/alertDeliveryService");
  await assert.rejects(runEmailAlerts({ recipientHashAlgorithm: "md5" }), /Unsupported/);
});
