const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const smeConfig = require("../src/constants/smeGpConstants");
const bmaConfig = require("../src/constants/bmaConstants");
const smeApi = require("../src/services/smeGpApi");
const bmaApi = require("../src/services/bmaApi");

// Load coordination modules with fake infrastructure, without starting MongoDB
// or registering a real cron job. Source tests below run the actual API modules.
function loadModule(file, dependencies, env = {}) {
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(path.join(__dirname, file), "utf8"), {
    module,
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
  const result = await smeApi.fetchSmeGpTors();
  assert.equal(calls.length, smeConfig.SEARCH_TERMS.length * 2);
  assert.ok(calls.some((call) => call.start === String(smeConfig.PAGE_SIZE)));
  assert.equal(result.fetched, 2);
  assert.equal(result.tors.length, 1);
  assert.equal(result.tors[0].refId, "sme-1");
  assert.equal(result.tors[0].budgetThb, 1200000);
  assert.equal(result.tors[0].category, "Web Application");
  assert.equal(result.source, "SME-GP");
});

test("BMA uses its own GET configuration, follows pages, and maps software plans", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url.origin + url.pathname, bmaConfig.API_URL);
    assert.equal(options.method, "GET");
    assert.equal(url.searchParams.get("masterBudgetYearId"), bmaConfig.BUDGET_YEAR);
    assert.equal(options.headers.Referer, `${bmaConfig.PLAN_URL}?budgetYear=${bmaConfig.BUDGET_YEAR}`);
    const page = Number(url.searchParams.get("pageNo"));
    calls.push(page);
    return {
      ok: true,
      json: async () => ({
        pageCount: 2,
        data: [{
          planProjectId: page,
          planProjectPlanProjectsCode: `bma-${page}`,
          planProjectPlanProjectName: page === 1 ? "จ้างพัฒนาระบบสารสนเทศ" : "จ้างปรับปรุงระบบไฟฟ้า",
          planProjectBudget: "2,500,000",
        }],
      }),
    };
  });
  const result = await bmaApi.fetchBmaTors();
  assert.deepEqual(calls, [1, 2]);
  assert.equal(result.fetched, 2);
  assert.equal(result.tors.length, 1);
  assert.equal(result.tors[0].refId, "bma-1");
  assert.equal(result.tors[0].budgetThb, 2500000);
  assert.equal(result.tors[0].egpUrl, `${bmaConfig.PLAN_URL}/1`);
  assert.equal(result.budgetYear, bmaConfig.BUDGET_YEAR);
  assert.equal(result.source, "BMA-EGP2");
});

test("sync service upserts each source and preserves the HTTP summary fields", async () => {
  const saved = [];
  const service = loadModule("../src/services/syncService.js", {
    "./torService": { upsertTorByRefId: async (refId, tor) => saved.push([refId, tor]) },
    "./smeGpApi": { fetchSmeGpTors: async () => ({ source: "SME-GP", method: "POST", fetched: 3, tors: [{ refId: "sme-1" }] }) },
    "./bmaApi": { fetchBmaTors: async () => ({ source: "BMA-EGP2", method: "GET", budgetYear: "2569", fetched: 4, tors: [{ refId: "bma-1" }] }) },
  });
  const result = await service.syncAllSources();
  assert.deepEqual(saved.map(([id]) => id).sort(), ["bma-1", "sme-1"]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    fetched: 3, saved: 1, matched: 1, method: "POST", source: "SME-GP",
    bmaEgp2BudgetYear: "2569", bmaEgp2Fetched: 4, bmaEgp2Matched: 1,
    bmaEgp2Method: "GET", bmaEgp2Saved: 1, bmaEgp2Source: "BMA-EGP2",
  });
  saved.length = 0;
  await service.syncSmeGp();
  assert.deepEqual(saved.map(([id]) => id), ["sme-1"]);
  saved.length = 0;
  await service.syncBma();
  assert.deepEqual(saved.map(([id]) => id), ["bma-1"]);
});

for (const flag of [undefined, "false", "true"]) {
  test(`sync job honors FETCH_ON_STARTUP=${flag} and schedules 02:00 Bangkok`, async () => {
    let syncs = 0;
    let scheduled;
    const job = loadModule("../src/services/syncScheduler.js", {
      "node-cron": { schedule: (...args) => { scheduled = args; } },
      "./syncService": { syncAllSources: async () => { syncs++; } },
    }, { FETCH_ON_STARTUP: flag });
    await job.startSyncScheduler();
    assert.equal(syncs, flag === "true" ? 1 : 0);
    assert.equal(scheduled[0], "0 2 * * *");
    assert.equal(scheduled[2].timezone, "Asia/Bangkok");
    assert.equal(scheduled[2].noOverlap, true);
    await scheduled[1]();
    assert.equal(syncs, flag === "true" ? 2 : 1);
  });
}

test("startup sync failure still enables the nightly job", async () => {
  let scheduled = false;
  const job = loadModule("../src/services/syncScheduler.js", {
    "node-cron": { schedule: () => { scheduled = true; } },
    "./syncService": { syncAllSources: async () => { throw new Error("API unavailable"); } },
  }, { FETCH_ON_STARTUP: "true" });
  await job.startSyncScheduler();
  assert.equal(scheduled, true);
});
