const cron = require("node-cron");
const torService = require("../services/torService");
const {
  fetchSmeGpSoftwareTors,
} = require("./sources/smeGpSource");
const {
  fetchBmaEgp2SoftwareTors,
  fetchBmaPlanProjects,
} = require("./sources/bmaEgp2PlanSource");

// Persist one normalized batch. Upserting by external refId makes repeat syncs idempotent.
async function saveTorBatch(tors) {
  let saved = 0;

  for (const torData of tors) {
    try {
      await torService.upsertTorByRefId(torData.refId, torData);
      saved++;
    } catch (err) {
      console.error(`Error saving TOR ${torData.refId}:`, err.message);
    }
  }

  return saved;
}

// Adapt a source's common result into the summary returned by sync endpoints.
async function syncSource(sourceResultPromise) {
  const result = await sourceResultPromise;
  const saved = await saveTorBatch(result.tors);

  return {
    budgetYear: result.budgetYear,
    fetched: result.fetched,
    matched: result.tors.length,
    method: result.method,
    saved,
    source: result.source,
  };
}

async function syncSmeGpOnly() {
  console.log("Starting SME-GP data sync...");
  const result = await syncSource(fetchSmeGpSoftwareTors());
  console.log(
    `SME-GP sync complete. Saved/Updated ${result.saved} of ${result.matched} matched TORs.`,
  );
  return result;
}

async function syncBmaEgp2Only() {
  console.log("Starting BMA e-GP2 data sync...");
  const result = await syncSource(fetchBmaEgp2SoftwareTors());
  console.log(
    `BMA e-GP2 sync complete. Saved/Updated ${result.saved} of ${result.matched} matched TORs.`,
  );
  return result;
}

async function syncProcurementData() {
  console.log("Starting procurement data sync...");
  // Each source owns its fetch/mapping details; this layer only coordinates saving.
  const [smeGpResult, bmaEgp2Result] = await Promise.all([
    syncSmeGpOnly(),
    syncBmaEgp2Only(),
  ]);

  console.log(
    `Procurement sync complete. Saved/Updated ${smeGpResult.saved} ${smeGpResult.source} TORs and ${bmaEgp2Result.saved} ${bmaEgp2Result.source} TORs.`,
  );
  return {
    fetched: smeGpResult.fetched,
    saved: smeGpResult.saved,
    matched: smeGpResult.matched,
    method: smeGpResult.method,
    source: smeGpResult.source,
    bmaEgp2BudgetYear: bmaEgp2Result.budgetYear,
    bmaEgp2Fetched: bmaEgp2Result.fetched,
    bmaEgp2Matched: bmaEgp2Result.matched,
    bmaEgp2Method: bmaEgp2Result.method,
    bmaEgp2Saved: bmaEgp2Result.saved,
    bmaEgp2Source: bmaEgp2Result.source,
  };
}

async function startCronJobs() {
  async function runSync(trigger) {
    console.log(`Running ${trigger} BMA/SME-GP sync job...`);
    try {
      const result = await syncProcurementData();
      console.log(`${trigger} sync job completed successfully:`, result);
    } catch (error) {
      console.error(`${trigger} sync job failed:`, error);
    }
  }

  // Finish the optional initial fetch before the server begins serving pages.
  if (process.env.FETCH_ON_STARTUP?.trim().toLowerCase() === "true") {
    await runSync("Startup");
  }

  cron.schedule("0 2 * * *", () => runSync("Scheduled"), {
    timezone: "Asia/Bangkok",
    noOverlap: true,
  });

  console.log("BMA/SME-GP sync scheduled for 02:00 Asia/Bangkok daily.");
}

module.exports = {
  fetchBmaPlanProjects,
  syncBmaEgp2Only,
  syncProcurementData,
  syncSmeGpOnly,
  syncSmeGpData: syncProcurementData,
  startCronJobs,
};
