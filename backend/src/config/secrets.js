const { readFileSync } = require("node:fs");

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

function readSecret(name, { required = false } = {}) {
  if (!SECRET_NAMES.includes(name)) throw new Error(`Unknown secret: ${name}`);
  const fileKey = `${name}_FILE`;
  let value;
  if (Object.hasOwn(process.env, fileKey)) {
    try {
      // Accommodate files created with a final newline, preserving other whitespace.
      value = readFileSync(process.env[fileKey], "utf8").replace(/\r?\n$/, "");
    } catch {
      // Never fall back to an environment value when a configured mount fails.
      throw new Error(`Cannot read ${fileKey}. Check the Docker secret mount.`);
    }
  } else if (process.env.SECRETS_ONLY === "true") {
    throw new Error(`${fileKey} must be configured in secrets-only mode.`);
  } else {
    // Preserve direct npm development; Docker explicitly disables this fallback.
    value = process.env[name];
  }
  if (required && !value?.trim()) throw new Error(`${name} is required. Configure ${fileKey} or the local backend/.env.`);
  return value || "";
}

function validateSecrets() {
  for (const name of SECRET_NAMES) {
    readSecret(name, { required: REQUIRED_SECRETS.includes(name) });
  }
}

module.exports = { SECRET_NAMES, REQUIRED_SECRETS, readSecret, validateSecrets };
