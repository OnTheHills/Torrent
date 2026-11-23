const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const jwt = require("jsonwebtoken");
const { SECRET_NAMES, readSecret, validateSecrets } = require("../../src/config/secrets");
const { syncSecrets } = require("../../scripts/sync-docker-secrets");
const atlasUri = "mongodb+srv://user:password%40with%23symbols@cluster.example.test/Torrent?retryWrites=true&w=majority";

function writeAtlasSecret(outputDir, value = atlasUri) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "mongo_uri"), value, { mode: 0o600 });
}

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

test("env setup preserves secret bytes and writes only individual secret files", (t) => {
  const directory = temporaryDirectory(t);
  const envFile = path.join(directory, ".env");
  const outputDir = path.join(directory, "output");
  const input = {
    JWT_SECRET: "test-$dollar-#hash-$(touch NEVER_EXECUTE)-`command`-with=equals",
    MONGO_URI: atlasUri,
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
    'MULTILINE_SETTING="line one\nline two"',
  ].join("\n"));
  writeAtlasSecret(outputDir);
  fs.writeFileSync(path.join(outputDir, "backend.env"), "LEGACY_SETTING=remove-me\n");
  syncSecrets({ envFile, outputDir });
  assert.equal(fs.statSync(outputDir).mode & 0o777, 0o700);
  for (const [key, value] of Object.entries(input)) {
    const filename = path.join(outputDir, key.toLowerCase());
    assert.equal(fs.readFileSync(filename, "utf8"), value);
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
  }
  assert.deepEqual(fs.readdirSync(outputDir).sort(), SECRET_NAMES.map((name) => name.toLowerCase()).sort());

  // Regeneration replaces supplied values and preserves omitted credentials.
  const previousMongoFile = fs.statSync(path.join(outputDir, "mongo_uri"));
  const previousLineFile = fs.statSync(path.join(outputDir, "line_channel_access_token"));
  fs.writeFileSync(envFile, "JWT_SECRET=rotated-test-secret\nMONGO_URI=mongodb://mongo/Torrent\n");
  syncSecrets({ envFile, outputDir });
  assert.equal(fs.readFileSync(path.join(outputDir, "jwt_secret"), "utf8"), "rotated-test-secret");
  assert.equal(fs.readFileSync(path.join(outputDir, "line_channel_access_token"), "utf8"), input.LINE_CHANNEL_ACCESS_TOKEN);
  assert.equal(fs.statSync(path.join(outputDir, "line_channel_access_token")).ino, previousLineFile.ino);
  assert.equal(fs.existsSync(path.join(outputDir, "backend.env")), false);
  assert.equal(fs.readFileSync(path.join(outputDir, "mongo_uri"), "utf8"), atlasUri);
  assert.equal(fs.statSync(path.join(outputDir, "mongo_uri")).ino, previousMongoFile.ino);

  // Clearing an optional credential requires an explicit empty setting.
  fs.writeFileSync(envFile, "LINE_CHANNEL_ACCESS_TOKEN=\n");
  syncSecrets({ envFile, outputDir });
  assert.equal(fs.readFileSync(path.join(outputDir, "line_channel_access_token"), "utf8"), "");
});

test("invalid setup leaves the previous secrets untouched", (t) => {
  const directory = temporaryDirectory(t);
  const envFile = path.join(directory, ".env");
  const outputDir = path.join(directory, "output");
  fs.writeFileSync(envFile, "PORT=5175\n");
  assert.throws(() => syncSecrets({ envFile, outputDir }), /Set JWT_SECRET/);
  assert.equal(fs.existsSync(outputDir), false);
  fs.writeFileSync(envFile, "JWT_SECRET=original\n");
  assert.throws(() => syncSecrets({ envFile, outputDir }), /Create backend\/\.secrets\/mongo_uri/);
  assert.equal(fs.existsSync(outputDir), false);
  writeAtlasSecret(outputDir);
  syncSecrets({ envFile, outputDir });
  fs.writeFileSync(envFile, "JWT_SECRET=\n");
  assert.throws(() => syncSecrets({ envFile, outputDir }), /Set JWT_SECRET/);
  assert.equal(fs.readFileSync(path.join(outputDir, "jwt_secret"), "utf8"), "original");
  fs.writeFileSync(envFile, "JWT_SECRET=changed\n");
  for (const value of ["   ", "mongodb+srv://user:<db_password>@cluster.example.test/Torrent", "mongodb://mongo/Torrent"]) {
    writeAtlasSecret(outputDir, value);
    assert.throws(() => syncSecrets({ envFile, outputDir }), /Set MONGO_URI|mongo_uri secret|placeholders/);
    assert.equal(fs.readFileSync(path.join(outputDir, "jwt_secret"), "utf8"), "original");
    assert.equal(fs.readFileSync(path.join(outputDir, "mongo_uri"), "utf8"), value);
  }
});

test("setup works after secret inputs are commented out without changing existing files", (t) => {
  const directory = temporaryDirectory(t);
  const envFile = path.join(directory, ".env");
  const outputDir = path.join(directory, "output");
  fs.writeFileSync(envFile, "JWT_SECRET=initial-test-secret\n");
  writeAtlasSecret(outputDir);
  syncSecrets({ envFile, outputDir });
  const before = Object.fromEntries(SECRET_NAMES.map((name) => {
    const filename = path.join(outputDir, name.toLowerCase());
    return [name, { value: fs.readFileSync(filename, "utf8"), inode: fs.statSync(filename).ino }];
  }));
  const config = "# JWT_SECRET=commented-value-is-not-used\n# MONGO_URI=commented-value-is-not-used\nPORT=5175\nCORS_ORIGIN=http://localhost:3000\n";
  fs.writeFileSync(envFile, config);
  syncSecrets({ envFile, outputDir });
  assert.equal(fs.readFileSync(envFile, "utf8"), config);
  for (const name of SECRET_NAMES) {
    const filename = path.join(outputDir, name.toLowerCase());
    assert.equal(fs.readFileSync(filename, "utf8"), before[name].value);
    assert.equal(fs.statSync(filename).ino, before[name].inode);
  }
  assert.equal(fs.existsSync(path.join(outputDir, "backend.env")), false);
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
  values.MONGO_URI = atlasUri;
  writeAtlasSecret(outputDir);
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
    const requestUrl = new URL(url);
    assert.equal(requestUrl.searchParams.has("api-key"), false);
    assert.equal(options.headers["api-key"], values.DATA_GO_API_KEY);
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

test("MongoDB never falls back to raw env values when the secret is missing or invalid", (t) => {
  const directory = temporaryDirectory(t);
  const filename = path.join(directory, "mongo_uri");
  setEnvironment(t, {
    SECRETS_ONLY: undefined,
    MONGO_URI_FILE: filename,
    MONGO_URI: atlasUri,
    MONGO_URI_HOST: atlasUri,
  });
  assert.throws(() => readSecret("MONGO_URI", { required: true }), /Cannot read MONGO_URI_FILE/);
  fs.writeFileSync(filename, "mongodb://localhost:27017/Torrent");
  assert.throws(() => readSecret("MONGO_URI", { required: true }), /Local MongoDB connections are disabled/);
  fs.writeFileSync(filename, "mongodb+srv://user:<db_password>@cluster.example.test/Torrent");
  assert.throws(() => readSecret("MONGO_URI", { required: true }), /Replace the placeholders/);
  fs.writeFileSync(filename, `${atlasUri}\r\n`);
  assert.equal(readSecret("MONGO_URI", { required: true }), atlasUri);
  process.env.SECRETS_ONLY = "true";
  delete process.env.MONGO_URI_FILE;
  assert.throws(() => readSecret("MONGO_URI", { required: true }), /MONGO_URI_FILE must be configured/);
});
