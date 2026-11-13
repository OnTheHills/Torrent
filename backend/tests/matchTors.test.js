const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

test("quota exhaustion pauses one TOR at the unfinished vendor", async () => {
  const job = {
    _id: "job-1",
    torId: "tor-1",
    status: "pending",
    generation: 1,
    cursor: null,
    retryCount: 0,
  };
  const tor = { _id: "tor-1", source: "EGP-PROCESS5", title: "Software project" };
  const vendors = [{ _id: "vendor-1" }, { _id: "vendor-2" }];
  const calls = [];
  const matches = [];
  let claimed = false;

  const queryResult = (value) => ({
    sort() { return this; },
    select() { return this; },
    lean: async () => value,
  });
  const dependencies = {
    "node:crypto": { randomUUID: () => "worker-1" },
    "@/models/user/User": {
      findOne: (query) => queryResult(
        vendors.find((user) => !query._id || user._id > query._id.$gt) || null,
      ),
    },
    "@/models/vendor/VendorProfile": {
      findOne: (query) => {
        const after = query.userId?.$gt;
        const next = vendors.find((user) => !after || user._id > after);
        return queryResult(
          next ? { userId: next._id, techSkills: ["Node.js"] } : null,
        );
      },
    },
    "@/models/tor/TOR": {
      findById: () => queryResult(tor),
      find: () => queryResult([tor]),
    },
    "@/models/tor/TORMatch": {
      updateOne: async (filter, update) => matches.push({ filter, update }),
      deleteOne: async () => {},
    },
    "@/models/tor/TorMatchJob": {
      find: (query) => {
        if (query.status?.$in) {
          return queryResult(
            ["pending", "running", "waiting"].includes(job.status) ? [job] : [],
          );
        }
        if (query.$or) {
          return queryResult(
            job.status === "pending" || job.status === "waiting" || job.status === "running"
              ? [job]
              : [],
          );
        }
        if (query.torId) return queryResult([job]);
        return queryResult([job]);
      },
      findOneAndUpdate: (filter, update) => {
        if (update?.$inc) {
          return Promise.resolve({ ...job, ...update.$set });
        }
        return {
          lean: async () => {
            if (claimed || job.status === "complete") return null;
            if (job.status !== "pending" && job.status !== "waiting" && job.status !== "running") {
              return null;
            }
            claimed = true;
            job.status = "running";
            job.lockId = "worker-1";
            Object.assign(job, update?.$set || {});
            return { ...job };
          },
        };
      },
      findOne: () => queryResult(null),
      exists: async () => job.status === "running",
      updateOne: async (_filter, update) => {
        Object.assign(job, update.$set);
        return { matchedCount: 1 };
      },
      updateMany: async () => ({ matchedCount: 0 }),
    },
    "@/services/tor/matchWithVertex": {
      matchWithVertex: async (_profile, matchedTor) => {
        calls.push(`${matchedTor._id}:${_profile.userId}`);
        if (_profile.userId === "vendor-2" && calls.filter((id) => id.startsWith("tor-1:vendor-2")).length === 1) {
          return { ok: false, code: "QUOTA_EXHAUSTED" };
        }
        return { ok: true, matchPercent: 80, matchReason: "Relevant skill" };
      },
    },
  };

  const module = { exports: {} };
  vm.runInNewContext(
    readFileSync(path.join(__dirname, "../src/jobs/matchTors.js"), "utf8"),
    {
      module,
      process: { env: {} },
      console: { info() {}, warn() {}, error() {} },
      setImmediate: (fn) => fn(),
      setTimeout: () => 0,
      clearTimeout() {},
      require: (name) => dependencies[name],
    },
  );

  await module.exports.drain();
  assert.equal(job.status, "waiting");
  assert.equal(job.cursor, "vendor-1");
  assert.equal(job.lastError, "QUOTA_EXHAUSTED");
  assert.deepEqual(calls, ["tor-1:vendor-1", "tor-1:vendor-2"]);
  assert.equal(matches.length, 1);

  claimed = false;
  await module.exports.drain();
  assert.equal(job.status, "complete");
  assert.deepEqual(calls, ["tor-1:vendor-1", "tor-1:vendor-2", "tor-1:vendor-2"]);
  assert.equal(matches.length, 2);
});

test("open notices from any source are eligible; SME-GP, closed, and past deadline are not", () => {
  const tors = [
    [{ status: "published", deadline: "2999-01-01" }, true],
    [{ status: "published", source: "BMA-EGP2", deadline: "2999-01-01" }, true],
    [{ status: "published", source: "EGP-PROCESS5", deadline: "2999-01-01" }, true],
    [{ status: "published", deadline: "2000-01-01" }, false],
    [{ status: "awarded" }, false],
    [{ status: "cancelled" }, false],
    [{ status: "closed" }, false],
    [{ status: "draft" }, true],
    [{ source: "SME-GP", status: "published", deadline: "2999-01-01" }, false],
    [{}, true],
  ];
  for (const mode of [undefined, "default", "published"]) {
    const module = { exports: {} };
    vm.runInNewContext(
      readFileSync(path.join(__dirname, "../src/jobs/matchTors.js"), "utf8"),
      {
        module,
        process: { env: mode ? { VERTEX_MATCH_TOR_STATUS: mode } : {} },
        console, setImmediate, setTimeout, clearTimeout,
        require: () => ({}),
      },
    );
    for (const [tor, eligible] of tors) {
      assert.equal(
        module.exports.fitScoreApplies(tor),
        eligible,
        `${mode || "default"}: ${tor.source || "any"} ${tor.status}`,
      );
    }
    assert.equal(module.exports.fitScoreApplies(null), false);
  }
});
