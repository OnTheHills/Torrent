const path = require("node:path");
const { spawnSync } = require("node:child_process");

// Invoke explicitly; ordinary `node --test` discovery must not launch another
// test runner (and report intentional mutation failures as normal regressions).
if (!process.env.NODE_TEST_CONTEXT) runMutations();

function runMutations() {

  // A bounded regression sample covering the changed features and independent
  // encryption, Google authentication and secret-loading behavior. Not the full suite.
  const tests = [
    "tests/notifications/lineNotifications.test.js",
    "tests/notifications/emailAlerts.test.js",
    "tests/security/dockerSecrets.test.js",
    "tests/crypto/cryptoAgility.test.js",
    "tests/crypto/cryptoParameters.test.js",
    "tests/tor/announcementBudget.test.js",
    "tests/auth/googleAuthSecurity.test.js",
  ];
  const backendRoot = path.resolve(__dirname, "../..");
  for (const mutation of [null, "line", "line-coordinated", "email", "session"]) {
    console.log(`\n=== ${mutation ? `${mutation}: SHA-256 family → SHA-512 family` : "Unmodified baseline"} ===`);
    const env = { ...process.env };
    delete env.TORRENT_CRYPTO_MUTATION;
    const args = ["--require", "module-alias/register"];
    if (mutation) {
      env.TORRENT_CRYPTO_MUTATION = mutation;
      args.push("--require", "./tests/crypto/fixtures/cryptoMutation.cjs");
    }
    args.push("--test", "--test-reporter=spec", ...tests);
    const result = spawnSync(process.execPath, args, {
      cwd: backendRoot, env, encoding: "utf8", timeout: 60_000,
    });
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    if (result.error || result.signal || result.status === null) {
      console.error(result.error || `Child interrupted: ${result.signal}`);
      process.exitCode = 1;
      break;
    }
    if (!mutation && result.status !== 0) {
      console.error("Baseline failed; mutation results would not be interpretable.");
      process.exitCode = 1;
      break;
    }
    if (mutation) {
      if (mutation === "line") {
        const output = result.stdout + result.stderr;
        if (result.status !== 0 && /fail 2\b/.test(output) &&
            !/Mutation must match|Unknown crypto mutation|Cannot find module/.test(output)) {
          console.log("PASS: unilateral LINE change is detected; original sender signatures are rejected as expected.");
        } else {
          console.error("Unexpected unilateral LINE mutation result.");
          process.exitCode = 1;
        }
      } else if (result.status === 0) {
        console.log("PASS: supported algorithm change passes the sampled regressions; this does not certify migration safety.");
      } else {
        console.error("Supported algorithm change failed regression tests.");
        process.exitCode = 1;
      }
    }
  }
}
