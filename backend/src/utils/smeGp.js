const cron = require("node-cron");
const torService = require("../services/torService");
const {
  fetchSmeGpSoftwareTors,
} = require("./sources/smeGpSource");
const {
  fetchBmaEgp2SoftwareTors,
  fetchBmaPlanProjects,
} = require("./sources/bmaEgp2PlanSource");

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

function startCronJobs() {
  // Schedule to run at 00:00 (midnight) every day
  cron.schedule("0 0 * * *", async () => {
      console.log("Running scheduled BMA/SME-GP sync job...");
    try {
      const result = await syncProcurementData();
      console.log("Scheduled sync job completed successfully:", result);
    } catch (error) {
      console.error("Scheduled sync job failed:", error);
    }
  });

  console.log("SME-GP sync cron job initialized.");
}

module.exports = {
  fetchBmaPlanProjects,
  syncBmaEgp2Only,
  syncProcurementData,
  syncSmeGpOnly,
  syncSmeGpData: syncProcurementData,
  startCronJobs,
};
