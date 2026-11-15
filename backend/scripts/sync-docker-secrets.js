const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");
const { SECRET_NAMES, REQUIRED_SECRETS } = require("../src/config/secrets");

const backendRoot = path.resolve(__dirname, "..");

function syncSecrets({ envFile = path.join(backendRoot, ".env"), outputDir = path.join(backendRoot, ".secrets") } = {}) {
  if (typeof parseEnv !== "function") throw new Error("Secret setup requires Node.js 22 or newer.");
  let environment;
  try {
    // Parse data only: never source/evaluate shell commands in the input file.
    environment = parseEnv(fs.readFileSync(envFile, "utf8"));
  } catch {
    throw new Error("Cannot read the backend env file. Copy backend/.env.example to backend/.env first.");
  }
  for (const name of REQUIRED_SECRETS) {
    if (!environment[name]?.trim()) throw new Error(`Set ${name} in the backend env file before creating secrets.`);
  }

  const excluded = new Set([...SECRET_NAMES, ...SECRET_NAMES.map((name) => `${name}_FILE`), "SECRETS_ONLY", "MONGO_URI_HOST"]);
  const settings = [];
  for (const [name, value] of Object.entries(environment)) {
    if (excluded.has(name)) continue;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || /[\r\n\0]/.test(value)) {
      throw new Error(`Unsupported non-secret setting: ${name}. Use a single-line value.`);
    }
    // Compose's raw env format preserves $, #, quotes and backslashes literally.
    settings.push(`${name}=${value}`);
  }

  // Validate everything before changing existing files. The output directory is
  // excluded from the build context and never bind-mounted into the backend API.
  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(outputDir).isSymbolicLink()) throw new Error("The secret output directory must not be a symbolic link.");
  fs.chmodSync(outputDir, 0o700);
  const staging = fs.mkdtempSync(path.join(outputDir, ".sync-"));
  try {
    for (const name of SECRET_NAMES) {
      fs.writeFileSync(path.join(staging, name.toLowerCase()), environment[name] || "", { mode: 0o600, flag: "wx" });
    }
    fs.writeFileSync(path.join(staging, "backend.env"), `${settings.join("\n")}\n`, { mode: 0o600, flag: "wx" });
    for (const name of [...SECRET_NAMES.map((name) => name.toLowerCase()), "backend.env"]) {
      fs.renameSync(path.join(staging, name), path.join(outputDir, name));
    }
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    if (process.argv.length > 3) throw new Error("Usage: node backend/scripts/sync-docker-secrets.js [path/to/backend.env]");
    syncSecrets({ envFile: process.argv[2] ? path.resolve(process.argv[2]) : undefined });
    console.log("Docker Compose secrets and non-secret settings prepared in backend/.secrets/.");
  } catch (error) {
    console.error(`Secret setup failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { syncSecrets };
