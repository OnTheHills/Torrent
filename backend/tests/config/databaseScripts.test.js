const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");

const backendRoot = path.resolve(__dirname, "../..");
const atlasUri = "mongodb+srv://user:test%40password@cluster.example.test/Torrent?retryWrites=true&w=majority";

for (const script of ["../src/server.js", "promote-admin.js", "enrich-sme-announcements.js", "reconcile-tor-merges.js"]) {
  for (const fileBacked of [false, true]) {
    test(`${script} uses the ${fileBacked ? "mounted secret" : "default host secret file"} and ignores legacy database env values`, (t) => {
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), "torrent-db-script-"));
      t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
      const uriFile = path.join(directory, "mongo_uri");
      fs.writeFileSync(uriFile, `${atlasUri}\n`, { mode: 0o600 });
      const env = {
        ...process.env,
        SECRETS_ONLY: fileBacked ? "true" : "false",
        MONGO_URI: "mongodb://obsolete-local/Torrent",
        MONGO_URI_HOST: "mongodb://obsolete-host-override/Torrent",
        JWT_SECRET: "script-test-signing-secret",
        CORS_ORIGIN: "http://localhost:3000",
        PORT: "5175",
      };
      for (const name of require("../../src/config/secrets").SECRET_NAMES) {
        delete env[`${name}_FILE`];
        if (fileBacked && name !== "MONGO_URI") {
          const filename = path.join(directory, name.toLowerCase());
          fs.writeFileSync(filename, name === "JWT_SECRET" ? "script-test-signing-secret" : "");
          env[`${name}_FILE`] = filename;
        }
      }
      delete env.MONGO_URI_FILE;
      if (fileBacked) env.MONGO_URI_FILE = uriFile;
      // Stop at the driver call, before any connection, migration, or script write.
      const preload = `
        require('module-alias/register');
        const fs = require('node:fs');
        const originalRead = fs.readFileSync;
        // Redirect the default host path into the fixture without touching the
        // developer's real Atlas credentials. Docker uses its explicit mount.
        fs.readFileSync = function(filename, ...args) {
          return originalRead.call(this,
            filename === ${JSON.stringify(path.join(backendRoot, ".secrets/mongo_uri"))}
              ? ${JSON.stringify(uriFile)} : filename, ...args);
        };
        require('mongoose').connect = async (uri, options) => {
          require('node:assert/strict').equal(uri, ${JSON.stringify(atlasUri)});
          require('node:assert/strict').equal(options.dbName, 'Torrent');
          process.stderr.write('EXPECTED_DATABASE_TARGET\\n');
          throw new Error('EXPECTED_DATABASE_TARGET');
        };
        process.argv[2] = 'admin@example.test';
        require(${JSON.stringify(`./scripts/${script}`)});
      `;
      const result = spawnSync(process.execPath, ["-e", preload], {
        cwd: backendRoot, env, encoding: "utf8", timeout: 15000,
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /^EXPECTED_DATABASE_TARGET$/m);
    });
  }
}
