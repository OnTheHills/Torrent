const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const smeConfig = require("@/constants/smeGpConstants");
const bmaConfig = require("@/constants/bmaConstants");
const egpConfig = require("@/constants/egpRssConstants");
const smeFetch = require("@/services/tor/api/smeGp/fetch");
const smeAdapter = require("@/services/tor/api/smeGp/adapter");
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

test("SME-GP walks POST pages, deduplicates searches, and filters software TORs", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, smeConfig.API_URL);
    assert.equal(options.method, "POST");
    const payload = JSON.parse(options.body);
    calls.push(payload);
    return {
      ok: true,
      json: async () => ({
        recordsFiltered: smeConfig.PAGE_SIZE + 1,
        data: payload.start === "0"
          ? [{ _id: "sme-1", title: "จ้างพัฒนาเว็บไซต์", budget: "1,200,000" }]
          : [{ _id: "sme-2", title: "ซื้อเครื่องคอมพิวเตอร์" }],
      }),
    };
  });
  const raw = await smeFetch.fetch();
  const result = { ...raw, fetched: raw.rows.length, tors: smeAdapter.adapt(raw.rows), source: smeFetch.source };
  assert.equal(calls.length, smeConfig.SEARCH_TERMS.length * 2);
  assert.ok(calls.some((call) => call.start === String(smeConfig.PAGE_SIZE)));
  assert.equal(result.fetched, smeConfig.SEARCH_TERMS.length * 2);
  assert.equal(result.tors.length, 1);
  assert.equal(result.tors[0].refId, "sme-1");
  assert.equal(result.tors[0].budgetThb, 1200000);
  assert.equal(result.tors[0].category, "Web Application");
  assert.equal(result.source, "SME-GP");
});

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

test("sync job adapts and persists each fetched API source", async () => {
  const saved = [];
  const job = loadModule("../src/jobs/syncAPI.js", {
    "node:fs": { readdirSync: () => [{ name: "smeGp", isDirectory: () => true }, { name: "bmaEgp2", isDirectory: () => true }] },
    "node:path": { join: (...parts) => {
      const name = parts.at(-2);
      const file = parts.at(-1);
      return file === "fetch" || file === "adapter" ? `${file}:${name}` : "api";
    } },
    "@/repositories/torRepository": {
      saveChanged: async (tors) => { saved.push(...tors.map(({ refId }) => refId)); return { created: tors.length, updated: 0, unchanged: 0 }; },
      deleteMissingFromSource: async () => ({ removed: 0 }),
    },
    "@/services/tor/api/bmaEgp2/files": { hydrateProjects: async (tors) => tors },
    "@/services/tor/api/smeGp/announcement": { enrich: async () => ({}) },
    "@/services/tor/ocr/ocrBmaPlans": { enrich: async () => ({ ocrAttempted: 1, ocrUpdated: 0, ocrSkipped: 1, ocrFailed: 0 }) },
    "fetch:smeGp": { fetch: async () => ({ rows: [{ refId: "sme-1" }] }), method: "POST", source: "SME-GP" },
    "adapter:smeGp": { adapt: (rows) => rows },
    "fetch:bmaEgp2": { fetch: async () => ({ metadata: { budgetYears: ["2570", "2569"] }, rows: [{ refId: "bma-1" }] }), method: "GET", source: "BMA-EGP2" },
    "adapter:bmaEgp2": { adapt: (rows) => rows },
  });
  const result = await job.syncAPI();
  assert.deepEqual(saved.sort(), ["bma-1", "sme-1"]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), [
    { source: "SME-GP", method: "POST", fetched: 1, matched: 1, created: 1, updated: 0, unchanged: 0 },
    { source: "BMA-EGP2", method: "GET", budgetYears: ["2570", "2569"], fetched: 1, matched: 1, created: 1, updated: 0, unchanged: 0, removed: 0, ocrAttempted: 1, ocrUpdated: 0, ocrSkipped: 1, ocrFailed: 0 },
  ]);
});

test("TOR persistence bulk-writes new and changed records but skips identical records", async () => {
  const existing = [{ _id: "tor-1", refId: "sme-1", source: "SME-GP", title: "Original" }];
  const writes = [];
  const repository = loadModule("../src/repositories/torRepository.js", {
    "node:util": require("node:util"),
    "@/models/TOR": {
      find: () => ({ lean: async () => existing }),
      bulkWrite: async (operations) => writes.push(...operations),
    },
  });

  const same = { refId: "sme-1", source: "SME-GP", title: "Original" };
  assert.deepEqual(JSON.parse(JSON.stringify(await repository.saveChanged([same]))), { created: 0, updated: 0, unchanged: 1 });
  assert.deepEqual(writes, []);

  const changed = { ...same, title: "Revised" };
  const newTor = { ...same, refId: "sme-2" };
  assert.deepEqual(JSON.parse(JSON.stringify(await repository.saveChanged([changed, newTor]))), { created: 1, updated: 1, unchanged: 0 });
  assert.deepEqual(JSON.parse(JSON.stringify(writes)), [
    { updateOne: { filter: { _id: "tor-1" }, update: { $set: changed } } },
    { insertOne: { document: newTor } },
  ]);
});

for (const flag of [undefined, "false", "true"]) {
  test(`sync job honors FETCH_ON_STARTUP=${flag} and schedules midnight Bangkok`, async () => {
    let syncs = 0;
    let scheduled;
    const job = loadModule("../src/scheduler/syncScheduler.js", {
      "node-cron": { schedule: (...args) => { scheduled = args; } },
      "@/jobs/syncAPI": { syncAPI: async () => { syncs++; } },
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
  }, { FETCH_ON_STARTUP: "true" });
  await job.startSyncScheduler();
  assert.equal(scheduled, true);
});
