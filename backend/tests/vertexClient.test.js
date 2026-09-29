const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const vertexErrors = require("@/services/ai/vertexErrors");

const credentialsDir = mkdtempSync(path.join(os.tmpdir(), "vertex-sa-"));
const credentialsFile = path.join(credentialsDir, "vertex-sa.json");
writeFileSync(credentialsFile, "{}");

const CONFIGURED_ENV = {
  GOOGLE_CLOUD_PROJECT: "torrent-507406",
  VERTEX_LOCATION: "us-central1",
  VERTEX_MODEL: "gemini-2.5-flash",
  GOOGLE_APPLICATION_CREDENTIALS: credentialsFile,
  VERTEX_TIMEOUT_MS: "50",
};

function loadVertexClient(env, FakeGoogleGenAI, logs = []) {
  const module = { exports: {} };
  vm.runInNewContext(
    readFileSync(path.join(__dirname, "../src/services/ai/vertexClient.js"), "utf8"),
    {
      module,
      AbortController,
      setTimeout,
      clearTimeout,
      Date,
      String,
      Boolean,
      Number,
      process: { env, cwd: () => process.cwd() },
      console: {
        log() {},
        error(...args) {
          logs.push(args);
        },
      },
      require(name) {
        if (name === "@google/genai") return { GoogleGenAI: FakeGoogleGenAI };
        if (name === "@/services/ai/vertexErrors") return vertexErrors;
        if (name === "node:fs" || name === "node:path") return require(name);
        throw new Error(`Unexpected dependency: ${name}`);
      },
    }
  );
  return module.exports;
}

test("missing Vertex env returns MISCONFIGURED without constructing the SDK", async () => {
  let constructed = 0;
  function FakeGoogleGenAI() {
    constructed += 1;
  }

  const { generateText, isConfigured } = loadVertexClient({}, FakeGoogleGenAI);
  const result = await generateText({ prompt: "ping" });

  assert.equal(isConfigured(), false);
  assert.equal(constructed, 0);
  assert.equal(result.ok, false);
  assert.equal(result.code, "MISCONFIGURED");
  assert.equal(result.message, "Vertex env vars are not set");
});

test("missing credentials file returns MISCONFIGURED without constructing the SDK", async () => {
  let constructed = 0;
  function FakeGoogleGenAI() {
    constructed += 1;
  }

  const { generateText, isConfigured } = loadVertexClient(
    {
      ...CONFIGURED_ENV,
      GOOGLE_APPLICATION_CREDENTIALS: path.join(credentialsDir, "missing.json"),
    },
    FakeGoogleGenAI
  );
  const result = await generateText({ prompt: "ping" });

  assert.equal(isConfigured(), false);
  assert.equal(constructed, 0);
  assert.equal(result.ok, false);
  assert.equal(result.code, "MISCONFIGURED");
  assert.equal(result.message, "Vertex credentials file is missing");
});

test("generateContent success returns the { ok, text } contract", async () => {
  const calls = [];
  function FakeGoogleGenAI(options) {
    this.options = options;
    this.models = {
      async generateContent(params) {
        calls.push({ options, params });
        return { text: "pong" };
      },
    };
  }

  const { generateText } = loadVertexClient(CONFIGURED_ENV, FakeGoogleGenAI);
  const result = await generateText({ prompt: "Reply with the single word pong." });

  assert.equal(result.ok, true);
  assert.equal(result.text, "pong");
  assert.equal(result.model, "gemini-2.5-flash");
  assert.equal(typeof result.latencyMs, "number");
  assert.equal(calls[0].options.enterprise, true);
  assert.equal(calls[0].params.model, "gemini-2.5-flash");
  assert.equal(calls[0].params.contents, "Reply with the single word pong.");
  assert.ok(calls[0].params.config.abortSignal);
});

test("SDK 403 billing maps to UNAUTHENTICATED", async () => {
  function FakeGoogleGenAI() {
    this.models = {
      async generateContent() {
        const error = new Error("This API method requires billing to be enabled");
        error.status = 403;
        throw error;
      },
    };
  }

  const { generateText } = loadVertexClient(CONFIGURED_ENV, FakeGoogleGenAI);
  const result = await generateText({ prompt: "ping" });

  assert.equal(result.ok, false);
  assert.equal(result.code, "UNAUTHENTICATED");
  assert.equal(result.message, "Vertex requires billing on the GCP project");
});

test("SDK 404 model maps to INVALID_RESPONSE", async () => {
  function FakeGoogleGenAI() {
    this.models = {
      async generateContent() {
        const error = new Error(
          "Publisher model was not found or your project does not have access to it"
        );
        error.status = 404;
        throw error;
      },
    };
  }

  const { generateText } = loadVertexClient(CONFIGURED_ENV, FakeGoogleGenAI);
  const result = await generateText({ prompt: "ping" });

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_RESPONSE");
  assert.equal(result.message, "Vertex model is not available in this region");
});

test("SDK 503 maps to UNAVAILABLE", async () => {
  function FakeGoogleGenAI() {
    this.models = {
      async generateContent() {
        const error = new Error("backend unavailable");
        error.status = 503;
        throw error;
      },
    };
  }

  const { generateText } = loadVertexClient(CONFIGURED_ENV, FakeGoogleGenAI);
  const result = await generateText({ prompt: "ping" });

  assert.equal(result.ok, false);
  assert.equal(result.code, "UNAVAILABLE");
  assert.equal(result.message, "Vertex is unavailable");
});

test("AbortError maps to TIMEOUT", async () => {
  function FakeGoogleGenAI() {
    this.models = {
      async generateContent() {
        const error = new Error("The operation was aborted");
        error.name = "AbortError";
        throw error;
      },
    };
  }

  const { generateText } = loadVertexClient(CONFIGURED_ENV, FakeGoogleGenAI);
  const result = await generateText({ prompt: "ping" });

  assert.equal(result.ok, false);
  assert.equal(result.code, "TIMEOUT");
});

test("failure logs do not include credentials or private key material", async () => {
  const logs = [];
  function FakeGoogleGenAI() {
    this.models = {
      async generateContent() {
        throw new Error("BEGIN PRIVATE KEY ----- /app/.secret/vertex-sa.json");
      },
    };
  }

  const { generateText } = loadVertexClient(CONFIGURED_ENV, FakeGoogleGenAI, logs);
  await generateText({ prompt: "ping" });

  const serialized = JSON.stringify(logs);
  assert.equal(serialized.includes("BEGIN PRIVATE KEY"), false);
  assert.equal(serialized.includes("/app/.secret/vertex-sa.json"), false);
  assert.match(serialized, /UNAVAILABLE/);
});
