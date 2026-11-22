// Loaded only in mutation-test subprocesses. Source files on disk stay intact.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const mutations = {
  line: {
    file: "services/line/lineService.js",
    before: 'algorithm = "sha256"',
    after: 'algorithm = "sha512"',
  },
  email: {
    file: "services/email/alertDeliveryService.js",
    before: 'recipientHashAlgorithm = DEFAULT_HASH_ALGORITHM',
    after: 'recipientHashAlgorithm = "sha512"',
  },
  session: {
    file: "utils/cryptoAlgorithms.js",
    before: 'DEFAULT_SESSION_ALGORITHM = "HS256"',
    after: 'DEFAULT_SESSION_ALGORITHM = "HS512"',
  },
};

const mutation = mutations[process.env.TORRENT_CRYPTO_MUTATION];
const coordinatedLine = process.env.TORRENT_CRYPTO_MUTATION === "line-coordinated";
if (!mutation && !coordinatedLine) throw new Error("Unknown crypto mutation.");
const changes = coordinatedLine ? [
  { ...mutations.line, file: `src/${mutations.line.file}` },
  // These are synthetic senders in tests, not a change to the real LINE service.
  { file: "tests/notifications/lineNotifications.test.js", before: 'createHmac("sha256", "test-secret")', after: 'createHmac("sha512", "test-secret")' },
  { file: "tests/security/dockerSecrets.test.js", before: 'createHmac("sha256", values.LINE_CHANNEL_SECRET)', after: 'createHmac("sha512", values.LINE_CHANNEL_SECRET)' },
] : [{ ...mutation, file: `src/${mutation.file}` }];
const targets = new Map(changes.map((change) => [path.resolve(__dirname, "../../..", change.file), change]));
const originalLoader = Module._extensions[".js"];
Module._extensions[".js"] = function loadMutation(module, filename) {
  const change = targets.get(filename);
  if (!change) return originalLoader(module, filename);
  const source = fs.readFileSync(filename, "utf8");
  if (source.split(change.before).length !== 2) {
    throw new Error(`Mutation must match exactly once: ${change.file}`);
  }
  module._compile(source.replace(change.before, change.after), filename);
};
