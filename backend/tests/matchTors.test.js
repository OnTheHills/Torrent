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
  const tor = { _id: "tor-1", title: "Software project" };
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
    "@/models/User": {
      findOne: (query) => queryResult(
        vendors.find((user) => !query._id || user._id > query._id.$gt) || null,
      ),
    },
    "@/models/VendorProfile": {
      findOne: ({ userId }) => queryResult({ userId, techSkills: ["Node.js"] }),
    },
    "@/models/TOR": {
      findById: () => queryResult(tor),
    },
    "@/models/TORMatch": {
      updateOne: async (filter, update) => matches.push({ filter, update }),
      deleteOne: async () => {},
    },
    "@/models/TorMatchJob": {
      findOneAndUpdate: () => ({
        lean: async () => {
          if (claimed || job.status === "complete") return null;
          claimed = true;
          job.status = "running";
          job.lockId = "worker-1";
          return { ...job };
        },
      }),
      findOne: () => queryResult(null),
      exists: async () => job.status === "running",
      updateOne: async (_filter, update) => {
        Object.assign(job, update.$set);
        return { matchedCount: 1 };
      },
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
      console: { warn() {}, error() {} },
      setImmediate,
      setTimeout,
      clearTimeout,
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
