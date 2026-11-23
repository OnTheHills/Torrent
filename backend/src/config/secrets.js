const { readFileSync } = require("node:fs");
const path = require("node:path");

// Keep this list in sync with the backend's Compose secret grants.
const SECRET_NAMES = Object.freeze([
  "JWT_SECRET",
  "MONGO_URI",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_CHANNEL_SECRET",
  "COOKIE_SECRET",
  "DATA_GO_API_KEY",
  "CSRF_SECRET",
  "RESEND_API_KEY",
]);
const REQUIRED_SECRETS = Object.freeze(["JWT_SECRET", "MONGO_URI"]);

function validateAtlasUri(value) {
  const uri = value.trim();
  if (!uri) throw new Error("The mongo_uri secret must contain your MongoDB Atlas URI.");
  if (/<[^>]+>/.test(uri)) {
    throw new Error("Replace the placeholders in backend/.secrets/mongo_uri with your URL-encoded Atlas credentials.");
  }
  if (!uri.startsWith("mongodb+srv://")) {
    throw new Error("The mongo_uri secret must use mongodb+srv:// for Atlas. Local MongoDB connections are disabled.");
  }
  return uri;
}

function readSecret(name, { required = false } = {}) {
  if (!SECRET_NAMES.includes(name)) throw new Error(`Unknown secret: ${name}`);
  const fileKey = `${name}_FILE`;
  let value;
  // MongoDB has one source on the host and one mounted path in Docker. Never
  // use MONGO_URI or the retired MONGO_URI_HOST environment values.
  const defaultMongoFile = name === "MONGO_URI" && process.env.SECRETS_ONLY !== "true"
    ? path.resolve(__dirname, "../../.secrets/mongo_uri")
    : undefined;
  if (Object.hasOwn(process.env, fileKey) || defaultMongoFile) {
    try {
      // Accommodate files created with a final newline, preserving other whitespace.
      const filename = Object.hasOwn(process.env, fileKey) ? process.env[fileKey] : defaultMongoFile;
      value = readFileSync(filename, "utf8").replace(/\r?\n$/, "");
    } catch {
      // Never fall back to an environment value when a configured mount fails.
      throw new Error(`Cannot read ${fileKey}. Check the secret file or Docker secret mount.`);
    }
  } else if (process.env.SECRETS_ONLY === "true") {
    throw new Error(`${fileKey} must be configured in secrets-only mode.`);
  } else {
    // Preserve direct npm development; Docker explicitly disables this fallback.
    value = process.env[name];
  }
  if (name !== "MONGO_URI" && required && !value?.trim()) {
    throw new Error(`${name} is required. Configure ${fileKey} or the local backend/.env.`);
  }
  return name === "MONGO_URI" ? validateAtlasUri(value || "") : value || "";
}

function validateSecrets() {
  for (const name of SECRET_NAMES) {
    readSecret(name, { required: REQUIRED_SECRETS.includes(name) });
  }
}

module.exports = { SECRET_NAMES, REQUIRED_SECRETS, readSecret, validateSecrets, validateAtlasUri };
