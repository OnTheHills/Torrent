const { existsSync } = require("node:fs");
const path = require("node:path");
const { GoogleGenAI } = require("@google/genai");
const { toVertexFailure } = require("@/services/ai/vertexErrors");

function readConfig() {
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  const location = process.env.VERTEX_LOCATION?.trim();
  const model = process.env.VERTEX_MODEL?.trim();
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const timeoutMs = Number(process.env.VERTEX_TIMEOUT_MS) || 15_000;

  return { project, location, model, credentials, timeoutMs };
}

function resolveCredentialsPath(credentials) {
  if (!credentials) return "";
  return path.isAbsolute(credentials)
    ? credentials
    : path.resolve(process.cwd(), credentials);
}

function isConfigured() {
  const { project, location, model, credentials } = readConfig();
  return Boolean(
    project &&
      location &&
      model &&
      credentials &&
      existsSync(resolveCredentialsPath(credentials))
  );
}

let cachedClient;

function getClient() {
  if (cachedClient) return cachedClient;
  const { project, location } = readConfig();
  cachedClient = new GoogleGenAI({
    enterprise: true,
    project,
    location,
  });
  return cachedClient;
}

async function generateText({ prompt, timeoutMs } = {}) {
  const config = readConfig();
  if (!config.project || !config.location || !config.model || !config.credentials) {
    return {
      ok: false,
      code: "MISCONFIGURED",
      message: "Vertex env vars are not set",
    };
  }

  const credentialsPath = resolveCredentialsPath(config.credentials);
  if (!existsSync(credentialsPath)) {
    return {
      ok: false,
      code: "MISCONFIGURED",
      message: "Vertex credentials file is missing",
    };
  }
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs ?? config.timeoutMs,
  );

  try {
    const response = await getClient().models.generateContent({
      model: config.model,
      contents: prompt || "Reply with the single word pong.",
      config: { abortSignal: controller.signal },
    });

    const text = String(response?.text || "").trim();
    if (!text) {
      return {
        ok: false,
        code: "INVALID_RESPONSE",
        message: "Vertex returned an unusable response",
      };
    }

    return {
      ok: true,
      text,
      model: config.model,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    const failure = toVertexFailure(error);
    console.error("vertex.generateText", {
      code: failure.code,
      latencyMs: Date.now() - started,
    });
    return failure;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { generateText, isConfigured, readConfig };