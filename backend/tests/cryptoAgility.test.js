const assert = require("node:assert/strict");
const { test } = require("node:test");
const crypto = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const announcement = require("@/services/tor/smeAnnouncement");
const filename = path.join(__dirname, "../src/services/tor/smeAnnouncement.js");
const source = readFileSync(filename, "utf8");
const PROJECT_ID = "69019529847";
const SALT = Buffer.from("0001020304050607", "hex");

// Independent OpenSSL fixture, not a captured response from the live e-GP site.
// Plaintext: {"projectId":"69019529847"}; passphrase: RDCrypto.
// openssl enc -aes-256-cbc -P -md md5 -S 0001020304050607 -pass pass:RDCrypto
// gives key 1E6621F6B530F12C9B54D4FE3FB10B85B44131C55F7A73EB6C6237290C89B7E3
// and IV 2F6F99A2D3097348341E44E0580AB6A8. Encrypting the plaintext with
// those values gives the ciphertext below. The wire envelope is Salted__ + salt
// + ciphertext, encoded as Base64 and then URL-encoded.
const CIPHERTEXT = Buffer.from("gOGoUErQCTf8Ofn8b+FX6AagCshxdvAiXgkXOhMmAUI=", "base64");
const FIXTURE = encodeURIComponent(Buffer.concat([
  Buffer.from("Salted__"), SALT, CIPHERTEXT,
]).toString("base64"));
const LISTING_ORIGIN = "https://process5.gprocurement.go.th/egp-agpc01-web/announcement/procurement";

// Run the real module with a private crypto dependency. Mutations affect only
// this instance: no production edits, shared crypto monkey-patches or network.
function loadWithCrypto(overrides, deriveKeyOverride) {
  const isolatedModule = { exports: {} };
  vm.runInNewContext(source, {
    module: isolatedModule,
    Buffer,
    URL,
    console,
    process,
    setTimeout,
    require(name) {
      if (name === "evp_bytestokey" && deriveKeyOverride) return deriveKeyOverride;
      return name === "node:crypto" ? { ...crypto, ...overrides } : require(name);
    },
  }, { filename });
  return isolatedModule.exports;
}

test("encryption evidence: decrypts an independent OpenSSL AES-256-CBC fixture", () => {
  assert.equal(announcement.decryptListingParam(FIXTURE).projectId, PROJECT_ID);
  assert.equal(announcement.projectIdFromListing(`${LISTING_ORIGIN}/${FIXTURE}`), PROJECT_ID);
});

test("encryption evidence: emitted bytes match the independent fixture for a fixed salt", () => {
  const saltRequests = [];
  const isolated = loadWithCrypto({
    randomBytes(size) {
      saltRequests.push(size);
      return Buffer.from(SALT);
    },
  });
  assert.equal(isolated.encryptListingParam(PROJECT_ID), FIXTURE);
  assert.deepEqual(saltRequests, [8]);
});

test("encryption evidence: real encrypt/decrypt and listing links preserve project IDs", () => {
  for (const id of [PROJECT_ID, "69029257201", "00000000001"]) {
    const parameter = announcement.encryptListingParam(id);
    assert.equal(announcement.decryptListingParam(parameter).projectId, id);
    assert.equal(announcement.projectIdFromListing(announcement.listingUrl(id)), id);
  }
});

test("agility limitation: changing only encryption to AES-256-CTR breaks current decoding", () => {
  const changed = loadWithCrypto({
    createCipheriv(_algorithm, key, iv) {
      return crypto.createCipheriv("aes-256-ctr", key, iv);
    },
  });
  const parameter = changed.encryptListingParam(PROJECT_ID);
  assert.throws(() => changed.decryptListingParam(parameter));
  assert.equal(changed.projectIdFromListing(`${LISTING_ORIGIN}/${parameter}`), "");
});

test("agility limitation: coordinated cipher change round-trips but loses legacy compatibility", () => {
  // CTR is a test mutation, not a proposed replacement encryption scheme.
  const changed = loadWithCrypto({
    createCipheriv(_algorithm, key, iv) {
      return crypto.createCipheriv("aes-256-ctr", key, iv);
    },
    createDecipheriv(_algorithm, key, iv) {
      return crypto.createDecipheriv("aes-256-ctr", key, iv);
    },
  });
  assert.equal(changed.decryptListingParam(changed.encryptListingParam(PROJECT_ID)).projectId, PROJECT_ID);
  assert.equal(changed.projectIdFromListing(changed.listingUrl(PROJECT_ID)), PROJECT_ID);
  assert.throws(() => changed.decryptListingParam(FIXTURE));
  assert.equal(changed.projectIdFromListing(`${LISTING_ORIGIN}/${FIXTURE}`), "");
  assert.equal(announcement.projectIdFromListing(changed.listingUrl(PROJECT_ID)), "");
  // A separate, unmodified instance still reads the original format.
  assert.equal(announcement.projectIdFromListing(`${LISTING_ORIGIN}/${FIXTURE}`), PROJECT_ID);
});

test("agility limitation: replacing the derivation also breaks existing encrypted links", () => {
  // Substitute an alternative library derivation at the dependency boundary.
  // This is a mutation only, not a proposed e-GP protocol upgrade.
  const changed = loadWithCrypto({}, (password, salt) => {
    const derived = crypto.pbkdf2Sync(password, salt, 1, 48, "sha256");
    return { key: derived.subarray(0, 32), iv: derived.subarray(32) };
  });
  assert.equal(changed.decryptListingParam(changed.encryptListingParam(PROJECT_ID)).projectId, PROJECT_ID);
  assert.throws(() => changed.decryptListingParam(FIXTURE));
  assert.equal(changed.projectIdFromListing(`${LISTING_ORIGIN}/${FIXTURE}`), "");
});

test("e-GP derivation delegates to the library with OpenSSL key and IV sizes", () => {
  const derive = require("evp_bytestokey");
  const calls = [];
  const isolated = loadWithCrypto({ randomBytes: () => Buffer.from(SALT) }, (...args) => {
    calls.push(args);
    return derive(...args);
  });
  assert.equal(isolated.encryptListingParam(PROJECT_ID), FIXTURE);
  assert.equal(isolated.decryptListingParam(FIXTURE).projectId, PROJECT_ID);
  assert.equal(calls.length, 2);
  for (const [password, salt, keyBits, ivBytes] of calls) {
    assert.equal(password.toString("utf8"), "RDCrypto");
    assert.deepEqual(salt, SALT);
    assert.equal(keyBits, 256);
    assert.equal(ivBytes, 16);
  }
});

// These passing characterization tests document current behavior and migration
// gaps. They do not certify ASVS V11.2.2, demonstrate a live provider upgrade,
// or prove that changing every cryptographic algorithm is safe. Key replacement
// is covered separately by dockerSecrets.test.js.
