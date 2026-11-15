const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const jwt = require("jsonwebtoken");
const { SECRET_NAMES, readSecret, validateSecrets } = require("../src/config/secrets");
const { syncSecrets } = require("../scripts/sync-docker-secrets");

function temporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "torrent-secrets-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function setEnvironment(t, settings) {
  for (const [name, value] of Object.entries(settings)) {
    const previous = process.env[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    });
  }
}

test("env setup preserves secret bytes and keeps them out of runtime settings", (t) => {
  const directory = temporaryDirectory(t);
  const envFile = path.join(directory, ".env");
  const outputDir = path.join(directory, "output");
  const input = {
    JWT_SECRET: "test-$dollar-#hash-$(touch NEVER_EXECUTE)-`command`-with=equals",
    MONGO_URI: "mongodb://user:password@mongo:27017/Torrent?authSource=admin",
    LINE_CHANNEL_ACCESS_TOKEN: "line-test-token==",
    LINE_CHANNEL_SECRET: "line-test-signing-secret",
    COOKIE_SECRET: "cookie-test-secret",
    DATA_GO_API_KEY: "data-go-test-key",
    CSRF_SECRET: "csrf-test-secret",
    RESEND_API_KEY: "resend-test-key",
  };
  fs.writeFileSync(envFile, [
    ...Object.entries(input).map(([key, value]) => `${key}='${value}'`),
    'EMAIL_FROM="Torrent <alerts@example.test>"',
    "CUSTOM_SETTING='literal-$value-#hash'",
    "JWT_SECRET_FILE=/untrusted/override",
    "MONGO_URI_HOST=mongodb://host-only-password@localhost/Torrent",
    "SECRETS_ONLY=false",
  ].join("\n"));
  syncSecrets({ envFile, outputDir });
  assert.equal(fs.statSync(outputDir).mode & 0o777, 0o700);
  for (const [key, value] of Object.entries(input)) {
    const filename = path.join(outputDir, key.toLowerCase());
    assert.equal(fs.readFileSync(filename, "utf8"), value);
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
  }
  const settings = fs.readFileSync(path.join(outputDir, "backend.env"), "utf8");
  assert.match(settings, /^EMAIL_FROM=Torrent <alerts@example.test>$/m);
  assert.match(settings, /^CUSTOM_SETTING=literal-\$value-#hash$/m);
  for (const [key, value] of Object.entries(input)) {
    assert.equal(settings.includes(key), false);
    assert.equal(settings.includes(value), false);
  }
  assert.doesNotMatch(settings, /SECRETS_ONLY|MONGO_URI_HOST|_FILE/);

  // Regeneration replaces values and clears removed optional credentials.
  fs.writeFileSync(envFile, "JWT_SECRET=rotated-test-secret\nMONGO_URI=mongodb://mongo/Torrent\n");
  syncSecrets({ envFile, outputDir });
  assert.equal(fs.readFileSync(path.join(outputDir, "jwt_secret"), "utf8"), "rotated-test-secret");
  assert.equal(fs.readFileSync(path.join(outputDir, "line_channel_access_token"), "utf8"), "");
  assert.equal(fs.readFileSync(path.join(outputDir, "backend.env"), "utf8"), "\n");
});

test("invalid setup leaves the previous secrets untouched", (t) => {
  const directory = temporaryDirectory(t);
  const envFile = path.join(directory, ".env");
  const outputDir = path.join(directory, "output");
  fs.writeFileSync(envFile, "JWT_SECRET=original\nMONGO_URI=mongodb://mongo/Torrent\n");
  syncSecrets({ envFile, outputDir });
  fs.writeFileSync(envFile, "MONGO_URI=mongodb://mongo/Torrent\n");
  assert.throws(() => syncSecrets({ envFile, outputDir }), /Set JWT_SECRET/);
  assert.equal(fs.readFileSync(path.join(outputDir, "jwt_secret"), "utf8"), "original");
  fs.writeFileSync(envFile, 'JWT_SECRET=changed\nMONGO_URI=mongodb://mongo/Torrent\nSETTING="line one\nline two"');
  assert.throws(() => syncSecrets({ envFile, outputDir }), /Unsupported non-secret setting: SETTING/);
  assert.equal(fs.readFileSync(path.join(outputDir, "jwt_secret"), "utf8"), "original");
});

test("secret reader supports local env, prioritizes files, and fails closed", (t) => {
  const directory = temporaryDirectory(t);
  const filename = path.join(directory, "jwt");
  setEnvironment(t, { SECRETS_ONLY: undefined, JWT_SECRET: "local-test-secret", JWT_SECRET_FILE: undefined });
  assert.equal(readSecret("JWT_SECRET"), "local-test-secret");
  process.env.JWT_SECRET_FILE = filename;
  assert.throws(() => readSecret("JWT_SECRET"), /Cannot read JWT_SECRET_FILE/);
  fs.writeFileSync(filename, "mounted-test-secret\r\n");
  assert.equal(readSecret("JWT_SECRET"), "mounted-test-secret");
  assert.equal(process.env.JWT_SECRET, "local-test-secret");
  fs.writeFileSync(filename, "");
  assert.equal(readSecret("JWT_SECRET"), "");
  assert.throws(() => readSecret("JWT_SECRET", { required: true }), /JWT_SECRET is required/);
  delete process.env.JWT_SECRET_FILE;
  process.env.SECRETS_ONLY = "true";
  assert.throws(() => readSecret("JWT_SECRET"), /JWT_SECRET_FILE must be configured/);
});

test("file-backed secrets drive JWT, LINE, and data.go without raw env values", async (t) => {
  const directory = temporaryDirectory(t);
  const envFile = path.join(directory, ".env");
  const outputDir = path.join(directory, "output");
  const values = Object.fromEntries(SECRET_NAMES.map((name) => [name, `mounted-test-${name}`]));
  values.MONGO_URI = "mongodb://mongo:27017/Torrent";
  fs.writeFileSync(envFile, Object.entries(values).map(([name, value]) => `${name}=${value}`).join("\n"));
  syncSecrets({ envFile, outputDir });
  const environment = { SECRETS_ONLY: "true" };
  for (const name of SECRET_NAMES) {
    environment[name] = undefined;
    environment[`${name}_FILE`] = path.join(outputDir, name.toLowerCase());
  }
  setEnvironment(t, environment);
  validateSecrets();
  const { signUserToken, verifyUserToken } = require("@/utils/session");
  const token = signUserToken({ _id: "user", role: "vendor", email: "vendor@example.test" });
  assert.equal(jwt.verify(token, values.JWT_SECRET).sub, "user");
  assert.equal(verifyUserToken(token).sub, "user");
  const { createHmac } = require("node:crypto");
  const body = Buffer.from('{"events":[]}');
  const signature = createHmac("sha256", values.LINE_CHANNEL_SECRET).update(body).digest("base64");
  assert.equal(require("@/services/line/lineService").verifySignature(body, signature), true);

  let lineCalls = 0;
  let dataGoCalls = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (String(url).includes("api.line.me")) {
      assert.equal(options.headers.Authorization, `Bearer ${values.LINE_CHANNEL_ACCESS_TOKEN}`);
      lineCalls++;
      return { ok: true };
    }
    assert.equal(new URL(url).searchParams.get("api-key"), values.DATA_GO_API_KEY);
    dataGoCalls++;
    return { ok: true, json: async () => ({ success: true, total: 0, data: [] }) };
  });
  await require("@/services/line/lineClient").pushText("line-user", "Test");
  const result = await require("@/services/tor/api/dataGo/fetch").fetchDataGo();
  assert.equal(lineCalls, 1);
  assert.ok(dataGoCalls > 0);
  assert.equal(result.metadata.errors.length, 0);
  for (const name of SECRET_NAMES) assert.equal(process.env[name], undefined);
});
