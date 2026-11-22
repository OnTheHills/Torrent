const { createHash, createHmac, timingSafeEqual } = require("node:crypto");

const DEFAULT_HASH_ALGORITHM = "sha256";
const DEFAULT_SESSION_ALGORITHM = "HS256";
const HASH_ALGORITHMS = Object.freeze(["sha256", "sha384", "sha512"]);
const SESSION_ALGORITHMS = Object.freeze(["HS256", "HS384", "HS512"]);

function approvedAlgorithm(algorithm, allowed) {
  if (!allowed.includes(algorithm)) throw new Error(`Unsupported cryptographic algorithm: ${algorithm}`);
  return algorithm;
}

function hashHex(value, { algorithm = DEFAULT_HASH_ALGORITHM } = {}) {
  return createHash(approvedAlgorithm(algorithm, HASH_ALGORITHMS)).update(value).digest("hex");
}

function verifyHmac(value, signature, secret, { algorithm = DEFAULT_HASH_ALGORITHM } = {}) {
  approvedAlgorithm(algorithm, HASH_ALGORITHMS);
  if (!secret || typeof signature !== "string" || !value) return false;
  const expected = Buffer.from(createHmac(algorithm, secret).update(value).digest("base64"));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function sessionAlgorithms(algorithms) {
  if (!Array.isArray(algorithms) || !algorithms.length) throw new Error("At least one session algorithm is required.");
  return algorithms.map((algorithm) => approvedAlgorithm(algorithm, SESSION_ALGORITHMS));
}

module.exports = {
  DEFAULT_HASH_ALGORITHM, DEFAULT_SESSION_ALGORITHM, SESSION_ALGORITHMS,
  hashHex, verifyHmac, sessionAlgorithms,
};
