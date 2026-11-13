const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const {
  mergePair,
  pickAdvancedStatus,
  valuesConflict,
  conflictSummary,
  trustOf,
} = require("@/services/tor/mergeDuplicateTors");

test("Process5 outranks data.go for trust", () => {
  assert.ok(trustOf("EGP-PROCESS5") > trustOf("DATA-GO-EGP"));
});

test("status prefers the more advanced lifecycle", () => {
  assert.equal(pickAdvancedStatus("published", "awarded"), "awarded");
  assert.equal(pickAdvancedStatus("awarded", "published"), "awarded");
  assert.equal(pickAdvancedStatus("draft", "published"), "published");
  assert.equal(pickAdvancedStatus("published", "cancelled"), "cancelled");
});

test("budget conflict keeps Process5 value and records conflict", () => {
  const process5 = {
    _id: "p5",
    source: "EGP-PROCESS5",
    refId: "69079416484",
    title: "Same title",
    status: "published",
    budgetThb: 4500000,
    egpUrl: "https://process5.example/p5",
  };
  const dataGo = {
    _id: "dg",
    source: "DATA-GO-EGP",
    refId: "69079416484",
    title: "Same title",
    status: "published",
    budgetThb: 4000000,
    egpUrl: "https://datago.example/dg",
  };
  assert.equal(valuesConflict("budgetThb", 4500000, 4000000), true);
  const { patch, conflicts, mergeStatus, sources } = mergePair(process5, dataGo);
  assert.equal(mergeStatus, "conflicted");
  assert.equal(patch.budgetThb, 4500000);
  assert.equal(patch.reviewStatus, "review");
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].field, "budgetThb");
  assert.equal(conflicts[0].resolution, "trusted");
  assert.equal(sources.length, 2);
  assert.match(conflictSummary(conflicts), /budgetThb/);
});

test("status published vs awarded keeps awarded and flags lifecycle_advanced", () => {
  const process5 = {
    _id: "p5",
    source: "EGP-PROCESS5",
    refId: "69079416484",
    title: "Election IT system",
    status: "published",
    budgetThb: 4500000,
    egpUrl: "https://process5.example/p5",
    documentUrl: "https://process5.example/doc.zip",
  };
  const dataGo = {
    _id: "dg",
    source: "DATA-GO-EGP",
    refId: "69079416484",
    title: "Election IT system",
    status: "awarded",
    budgetThb: 4500000,
    egpUrl: "https://datago.example/dg",
  };
  const { patch, conflicts, mergeStatus } = mergePair(process5, dataGo);
  assert.equal(mergeStatus, "conflicted");
  assert.equal(patch.status, "awarded");
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].field, "status");
  assert.equal(conflicts[0].resolution, "lifecycle_advanced");
  assert.equal(patch.reviewStatus, "review");
});

test("identical fields merge cleanly with both source URLs kept", () => {
  const process5 = {
    _id: "p5",
    source: "EGP-PROCESS5",
    refId: "69079416484",
    title: "Election IT system",
    status: "published",
    budgetThb: 4500000,
    egpUrl: "https://process5.example/p5",
    documentUrl: "https://process5.example/doc.zip",
  };
  const dataGo = {
    _id: "dg",
    source: "DATA-GO-EGP",
    refId: "69079416484",
    title: "Election IT system",
    status: "published",
    budgetThb: 4500000,
    egpUrl: "https://datago.example/dg",
  };
  const { patch, conflicts, mergeStatus, sources } = mergePair(process5, dataGo);
  assert.equal(mergeStatus, "clean");
  assert.deepEqual(conflicts, []);
  assert.equal(patch.reviewStatus, undefined);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].egpUrl, process5.egpUrl);
  assert.equal(sources[1].egpUrl, dataGo.egpUrl);
  assert.equal(sources[1].absorbedTorId, "dg");
});

test("mergeByRefIds hides secondary and updates survivor", async () => {
  const store = [
    {
      _id: "p5",
      source: "EGP-PROCESS5",
      refId: "69079416484",
      title: "Election IT system",
      status: "published",
      budgetThb: 4500000,
      egpUrl: "https://process5.example/p5",
      documentUrl: "https://process5.example/doc.zip",
      hidden: false,
    },
    {
      _id: "dg",
      source: "DATA-GO-EGP",
      refId: "69079416484",
      title: "Election IT system",
      status: "awarded",
      budgetThb: 4500000,
      egpUrl: "https://datago.example/dg",
      hidden: false,
    },
  ];
  const updates = [];
  const deletes = [];

  const module = { exports: {} };
  vm.runInNewContext(
    readFileSync(path.join(__dirname, "../src/services/tor/mergeDuplicateTors.js"), "utf8"),
    {
      module,
      console,
      require(name) {
        if (name === "@/models/tor/TOR") {
          return {
            find: (query) => ({
              lean: async () =>
                store.filter((tor) => {
                  if (query.refId?.$in && !query.refId.$in.includes(tor.refId)) return false;
                  if (query.source?.$in && !query.source.$in.includes(tor.source)) return false;
                  if (query.$or) {
                    return query.$or.some((clause) => {
                      if (clause.hidden?.$ne === true) return !tor.hidden;
                      if (clause.hiddenReason === "merged") return tor.hiddenReason === "merged";
                      return false;
                    });
                  }
                  return true;
                }),
            }),
            findByIdAndUpdate: async (id, update) => {
              updates.push({ id: String(id), update });
              const row = store.find((tor) => String(tor._id) === String(id));
              if (row && update.$set) Object.assign(row, update.$set);
              return row;
            },
            aggregate: async () => [],
          };
        }
        if (name === "@/models/tor/TORMatch") {
          return {
            deleteMany: async (filter) => {
              deletes.push(["match", filter]);
              return { deletedCount: 1 };
            },
          };
        }
        if (name === "@/models/tor/TorMatchJob") {
          return {
            deleteMany: async (filter) => {
              deletes.push(["job", filter]);
              return { deletedCount: 1 };
            },
          };
        }
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );

  const summary = await module.exports.mergeByRefIds(["69079416484"]);
  assert.equal(summary.merged, 1);
  assert.equal(summary.conflicted, 1);
  assert.equal(String(summary.survivorIds[0]), "p5");
  assert.equal(String(summary.absorbedIds[0]), "dg");
  const survivorUpdate = updates.find((row) => row.id === "p5");
  const absorbedUpdate = updates.find((row) => row.id === "dg");
  assert.equal(survivorUpdate.update.$set.status, "awarded");
  assert.equal(survivorUpdate.update.$set.mergeStatus, "conflicted");
  assert.equal(survivorUpdate.update.$set.reviewStatus, "review");
  assert.equal(absorbedUpdate.update.$set.hidden, true);
  assert.equal(absorbedUpdate.update.$set.hiddenReason, "merged");
  assert.ok(deletes.length >= 2);
});

test("process5 adapter maps winner flow to awarded", () => {
  const { adapt } = require("@/services/tor/api/dataGoProcess5/adapter");
  const mapped = adapt([
    {
      dataGo: {
        project_id: "69079416484",
        project_name: "จ้างพัฒนาระบบสารสนเทศ",
        project_money: 4500000,
      },
      project: {
        projectId: "69079416484",
        projectName: "จ้างพัฒนาระบบสารสนเทศ",
        projectStatus: "A",
        announceType: "W0",
      },
      procurement: {
        projectId: "69079416484",
        projectMoney: 4500000,
        flowName: "ประกาศผู้ชนะ",
      },
      documentUrl: "https://example.com/doc.zip",
    },
  ]);
  assert.equal(mapped[0].status, "awarded");
});
