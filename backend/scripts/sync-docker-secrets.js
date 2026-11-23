const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");
const { SECRET_NAMES, REQUIRED_SECRETS, validateAtlasUri } = require("../src/config/secrets");

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
  if (fs.existsSync(outputDir) && fs.lstatSync(outputDir).isSymbolicLink()) {
    throw new Error("The secret output directory must not be a symbolic link.");
  }
  const writes = new Map();
  for (const name of SECRET_NAMES) {
    const filename = path.join(outputDir, name.toLowerCase());
    let value;
    if (name === "MONGO_URI") {
      // The Atlas URI is managed directly in this file. An old env assignment
      // must never overwrite it when process.sh prepares other secrets.
      if (!fs.existsSync(filename) || !fs.lstatSync(filename).isFile()) {
        throw new Error("Create backend/.secrets/mongo_uri with your Atlas URI before creating secrets.");
      }
      value = fs.readFileSync(filename, "utf8");
      validateAtlasUri(value);
    } else if (Object.hasOwn(environment, name)) {
      // An explicit blank clears an optional credential; an omitted/commented
      // setting preserves the existing secret after initial provisioning.
      value = environment[name];
      writes.set(name, value);
    } else if (fs.existsSync(filename)) {
      if (!fs.lstatSync(filename).isFile()) throw new Error(`Existing ${name} must be a regular secret file.`);
      value = fs.readFileSync(filename, "utf8");
    } else {
      value = "";
      writes.set(name, value);
    }
    if (REQUIRED_SECRETS.includes(name) && !value.trim()) {
      throw new Error(`Set ${name} in the backend env file before creating secrets.`);
    }
  }

  // Validate everything before changing existing files. The output directory is
  // excluded from the build context and never bind-mounted into the backend API.
  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(outputDir).isSymbolicLink()) throw new Error("The secret output directory must not be a symbolic link.");
  fs.chmodSync(outputDir, 0o700);
  const staging = fs.mkdtempSync(path.join(outputDir, ".sync-"));
  try {
    for (const [name, value] of writes) {
      fs.writeFileSync(path.join(staging, name.toLowerCase()), value, { mode: 0o600, flag: "wx" });
    }
    for (const name of writes.keys()) {
      const filename = name.toLowerCase();
      fs.renameSync(path.join(staging, filename), path.join(outputDir, filename));
    }
    for (const name of SECRET_NAMES) {
      fs.chmodSync(path.join(outputDir, name.toLowerCase()), 0o600);
    }
    // Remove the obsolete generated settings file from earlier versions.
    fs.rmSync(path.join(outputDir, "backend.env"), { force: true });
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    if (process.argv.length > 3) throw new Error("Usage: node backend/scripts/sync-docker-secrets.js [path/to/backend.env]");
    syncSecrets({ envFile: process.argv[2] ? path.resolve(process.argv[2]) : undefined });
    console.log("Docker Compose secret files prepared in backend/.secrets/.");
  } catch (error) {
    console.error(`Secret setup failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { syncSecrets };
