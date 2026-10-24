const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const bmaConfig = require("@/constants/bmaConstants");
const egpConfig = require("@/constants/egpRssConstants");
const bmaFetch = require("@/services/tor/api/bmaEgp2/fetch");
const bmaAdapter = require("@/services/tor/api/bmaEgp2/adapter");
const egpFetch = require("@/services/tor/api/egpRss/fetch");
const egpAdapter = require("@/services/tor/api/egpRss/adapter");

// Load jobs with fake infrastructure, without starting MongoDB or real cron jobs.
function loadModule(file, dependencies, env = {}) {
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(path.join(__dirname, file), "utf8"), {
    module,
    __dirname: path.dirname(path.join(__dirname, file)),
    process: { env },
    console: { log() {}, error() {} },
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}

test("BMA uses project-search, follows pages, and maps software TORs", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url.origin + url.pathname, bmaConfig.API_URL);
    assert.equal(options.method, "GET");
    assert.ok(bmaConfig.BUDGET_YEARS.includes(url.searchParams.get("masterBudgetYearId")));
    assert.ok(options.headers.Referer.startsWith(bmaConfig.SEARCH_URL));
    const page = Number(url.searchParams.get("pageNo"));
    const year = url.searchParams.get("masterBudgetYearId");
    const type = url.searchParams.get("masterAnnounceTypeId");
    calls.push(`${year}:${type}:${page}`);
    const active = year === "2570" && type === bmaConfig.ANNOUNCE_TYPES[0].id;
    return {
      ok: true,
      json: async () => ({
        pageCount: active ? 2 : 1,
        data: active
          ? [{
              projectId: `proj-${page}`,
              projectNumber: `bma-${page}`,
              projectName: page === 1 ? "จ้างพัฒนาระบบสารสนเทศ" : "จ้างปรับปรุงระบบไฟฟ้า",
              projectBudget: 2500000,
              masterOrgDepartmentName: "กองเทคโนโลยี",
              masterContractAvailableCode: "S1",
            }]
          : [],
      }),
    };
  });
  const raw = await bmaFetch.fetch();
  const result = { ...raw, fetched: raw.rows.length, tors: bmaAdapter.adapt(raw.rows), source: bmaFetch.source };
  assert.ok(calls.some((call) => call.endsWith(":2")));
  assert.equal(result.fetched, 2);
  assert.equal(result.tors.length, 1);
  assert.equal(result.tors[0].refId, "bma-1");
  assert.equal(result.tors[0].budgetThb, 2500000);
  assert.equal(result.tors[0].budgetYear, "2570");
  assert.equal(result.tors[0].egpUrl, `${bmaConfig.PROJECT_URL}/proj-1`);
  assert.deepEqual(result.metadata.budgetYears, bmaConfig.BUDGET_YEARS);
  assert.equal(result.source, "BMA-EGP2");
});

test("e-GP RSS walks official B0/D0/W0 feeds and keeps software draft TORs", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    const parsed = new URL(url);
    calls.push(`${parsed.searchParams.get("deptId")}:${parsed.searchParams.get("anounceType")}`);
    const type = parsed.searchParams.get("anounceType");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss><channel>
        <item>
          <title>จ้างพัฒนาระบบสารสนเทศ ปีงบประมาณ พ.ศ. 2570</title>
          <link>https://process.gprocurement.go.th/notice/${type}-soft</link>
          <guid>egp-${type}-soft</guid>
          <pubDate>Wed, 30 Sep 2026 00:00:00 GMT</pubDate>
          <description>หน่วยงาน กระทรวงดิจิทัล งบประมาณ 1,500,000 บาท</description>
        </item>
        <item>
          <title>จ้างเหมาก่อสร้างถนน</title>
          <link>https://process.gprocurement.go.th/notice/${type}-road</link>
          <guid>egp-${type}-road</guid>
        </item>
      </channel></rss>`;
    return {
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode(xml).buffer,
    };
  });
  const raw = await egpFetch.fetch();
  const tors = egpAdapter.adapt(raw.rows);
  assert.equal(calls.length, egpConfig.DEPARTMENTS.length * egpConfig.ANNOUNCE_TYPES.length);
  assert.ok(calls.includes("1700:B0"));
  assert.ok(calls.includes("1700:D0"));
  assert.equal(raw.rows.length, 6);
  assert.equal(tors.length, 1);
  assert.equal(tors[0].status, "awarded");
  assert.equal(tors[0].budgetThb, 1500000);
  assert.equal(tors[0].budgetYear, "2570");
  assert.equal(tors[0].agencyId, "mdes");
  assert.equal(tors[0].source, "EGP-RSS");
  assert.equal(tors[0].category, "Software Development");
});

const syncJobMocks = {
  "@/services/tor/api/bmaEgp2/files": { hydrateProjects: async (tors) => tors },
  "@/services/tor/ocr/ocrBmaPlans": { enrich: async () => ({}) },
  "@/services/admin/classification": { activeRules: async () => null },
  "@/services/admin/scoreReviewTors": {
    scoreTorIds: async (ids) => ({ scored: ids.length, vertexScored: 0 }),
  },
  "@/services/tor/smeAnnouncement": {
    enrichStored: async () => ({
      announcementRead: 0,
      announcementUpdated: 0,
      announcementSkipped: 1,
      announcementFailed: 0,
    }),
  },
};

test("sync job saves data.go projects but waits for a TOR document before matching", async () => {
  const saved = [];
  const queued = [];
  const scored = [];
  const job = loadModule("../src/jobs/syncAPI.js", {
    "node:path": { join: (...parts) => {
      const name = parts.at(-2);
      const file = parts.at(-1);
      return file === "fetch" || file === "adapter" ? `${file}:${name}` : "api";
    } },
    "@/repositories/torRepository": {
      findBySource: async () => saved.map((refId) => ({ refId, source: "EGP-PROCESS5" })),
      saveChanged: async (tors) => {
        saved.push(...tors.map(({ refId }) => refId));
        return {
          created: tors.length,
          updated: 0,
          unchanged: 0,
          changedTorIds: tors.map(({ refId }) => `tor-id-${refId}`),
          createdTorIds: tors.map(({ refId }) => `tor-id-${refId}`),
        };
      },
    },
    "@/services/tor/ocr/ocrEgp": { enrich: async () => ({ ocrAttempted: 1, ocrUpdated: 0, ocrSkipped: 1, ocrFailed: 0 }) },
    "@/jobs/matchTors": { enqueueTors: async (ids) => { queued.push(...ids); return ids.length; } },
    ...syncJobMocks,
    "@/services/admin/scoreReviewTors": {
      scoreTorIds: async (ids) => {
        scored.push(...ids);
        return { scored: ids.length, vertexScored: 0 };
      },
    },
    "fetch:dataGoProcess5": { fetch: async () => ({ metadata: { discovered: 1, process5Resolved: 1, documentLinks: 0 }, rows: [{ refId: "egp-1" }] }), method: "GET", source: "EGP-PROCESS5" },
    "adapter:dataGoProcess5": { adapt: (rows) => rows },
  });
  const result = await job.syncAPI();
  assert.deepEqual(saved, ["egp-1"]);
  assert.deepEqual(queued, []);
  assert.deepEqual(scored, ["tor-id-egp-1"]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), [
    { source: "EGP-PROCESS5", method: "GET", discovered: 1, process5Resolved: 1, documentLinks: 0, fetched: 1, matched: 1, created: 1, updated: 0, unchanged: 0, ocrAttempted: 1, ocrUpdated: 0, ocrSkipped: 1, ocrFailed: 0 },
    { source: "SME-GP", announcementRead: 0, announcementUpdated: 0, announcementSkipped: 1, announcementFailed: 0 },
  ]);
});

test("data.go project enters matching only after its TOR has been extracted", async () => {
  const queued = [];
  const job = loadModule("../src/jobs/syncAPI.js", {
    "node:path": { join: (...parts) => `${parts.at(-1)}:${parts.at(-2)}` },
    "@/repositories/torRepository": {
      saveChanged: async () => ({ changedTorIds: ["project-id"], createdTorIds: ["project-id"], created: 1 }),
      findBySource: async () => [{ refId: "egp-1", documentUrl: "https://process5.gprocurement.go.th/tor.zip" }],
    },
    "@/services/tor/ocr/ocrEgp": { enrich: async () => ({ updatedTorIds: ["ocr-id"], ocrUpdated: 1 }) },
    "@/jobs/matchTors": { enqueueTors: async (ids) => queued.push(...ids) },
    ...syncJobMocks,
    "fetch:dataGoProcess5": { fetch: async () => ({ rows: [{}] }), method: "GET", source: "EGP-PROCESS5" },
    "adapter:dataGoProcess5": { adapt: () => [{ refId: "egp-1", documentUrl: "https://process5.gprocurement.go.th/tor.zip" }] },
  });
  await job.syncAPI();
  assert.deepEqual(queued, ["ocr-id"]);
});

test("data.go rate limit still processes saved TOR ZIPs", async () => {
  const queued = [];
  const saved = [{ refId: "egp-1", documentUrl: "https://process5.gprocurement.go.th/tor.zip" }];
  const job = loadModule("../src/jobs/syncAPI.js", {
    "node:path": { join: (...parts) => `${parts.at(-1)}:${parts.at(-2)}` },
    "@/repositories/torRepository": {
      saveChanged: async () => ({ created: 0, updated: 0, unchanged: 0, changedTorIds: [], createdTorIds: [] }),
      findBySource: async () => saved,
    },
    "@/services/tor/ocr/ocrEgp": { enrich: async (tors) => {
      assert.deepEqual(tors, saved);
      return { updatedTorIds: ["ocr-id"], ocrUpdated: 1 };
    } },
    "@/jobs/matchTors": { enqueueTors: async (ids) => queued.push(...ids) },
    ...syncJobMocks,
    "fetch:dataGoProcess5": { fetch: async () => { throw new Error("data.go discovery failed: data.go API HTTP 429"); }, method: "GET", source: "EGP-PROCESS5" },
    "adapter:dataGoProcess5": { adapt: () => [] },
  });
  const [result] = await job.syncAPI();
  assert.equal(result.rateLimited, true);
  assert.equal(result.ocrUpdated, 1);
  assert.deepEqual(queued, ["ocr-id"]);
});

test("TOR persistence bulk-writes new and changed records but skips identical records", async () => {
  const existing = [{ _id: "tor-1", refId: "data-1", source: "DATA-GO-EGP", title: "Original" }];
  const writes = [];
  function idsFor(query) {
    if (!query.$or) return existing;
    return query.$or.map((pair) => ({
      _id: pair.refId === "data-1" ? "tor-1" : "tor-2",
    }));
  }
  const repository = loadModule("../src/repositories/torRepository.js", {
    "node:util": require("node:util"),
    "@/models/TOR": {
      find: (query) => ({
        lean: async () => idsFor(query),
        select: () => ({ lean: async () => idsFor(query) }),
      }),
      bulkWrite: async (operations) => writes.push(...operations),
    },
    "@/models/TORMatch": { deleteMany: async () => ({ deletedCount: 0 }) },
    "@/models/TorMatchJob": { deleteMany: async () => ({ deletedCount: 0 }), deleteOne: async () => ({ deletedCount: 0 }) },
  });

  const same = { refId: "data-1", source: "DATA-GO-EGP", title: "Original" };
  assert.deepEqual(JSON.parse(JSON.stringify(await repository.saveChanged([same]))), {
    created: 0,
    updated: 0,
    unchanged: 1,
    changedTorIds: [],
    createdTorIds: [],
  });
  assert.deepEqual(writes, []);

  const changed = { ...same, title: "Revised" };
  const newTor = { ...same, refId: "data-2" };
  assert.deepEqual(JSON.parse(JSON.stringify(await repository.saveChanged([changed, newTor]))), {
    created: 1,
    updated: 1,
    unchanged: 0,
    changedTorIds: ["tor-1", "tor-2"],
    createdTorIds: ["tor-2"],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(writes)), [
    { updateOne: { filter: { _id: "tor-1" }, update: { $set: changed } } },
    { insertOne: { document: newTor } },
  ]);
});

const syncRunsMock = {
  start: async () => ({ _id: "run-1" }),
  finish: async () => {},
  closeInterrupted: async () => {},
};

for (const flag of [undefined, "false", "true"]) {
  test(`sync job honors FETCH_ON_STARTUP=${flag} and schedules midnight Bangkok`, async () => {
    let syncs = 0;
    let scheduled;
    const job = loadModule("../src/scheduler/syncScheduler.js", {
      "node-cron": { schedule: (...args) => { scheduled = args; } },
      "@/jobs/syncAPI": { syncAPI: async () => { syncs++; } },
      "@/services/admin/syncRuns": syncRunsMock,
    }, { FETCH_ON_STARTUP: flag });
    await job.startSyncScheduler();
    assert.equal(syncs, flag === "true" ? 1 : 0);
    assert.equal(scheduled[0], "0 0 * * *");
    assert.equal(scheduled[2].timezone, "Asia/Bangkok");
    assert.equal(scheduled[2].noOverlap, true);
    await scheduled[1]();
    assert.equal(syncs, flag === "true" ? 2 : 1);
  });
}

test("startup sync failure still enables the nightly job", async () => {
  let scheduled = false;
  const job = loadModule("../src/scheduler/syncScheduler.js", {
    "node-cron": { schedule: () => { scheduled = true; } },
    "@/jobs/syncAPI": { syncAPI: async () => { throw new Error("API unavailable"); } },
    "@/services/admin/syncRuns": syncRunsMock,
  }, { FETCH_ON_STARTUP: "true" });
  await job.startSyncScheduler();
  assert.equal(scheduled, true);
});
