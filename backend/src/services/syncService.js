const torService = require("./torService");
const { fetchSmeGpTors } = require("./smeGpApi");
const { fetchBmaTors } = require("./bmaApi");

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

async function syncSmeGp() {
  console.log("Starting SME-GP data sync...");
  const result = await syncSource(fetchSmeGpTors());
  console.log(
    `SME-GP sync complete. Saved/Updated ${result.saved} of ${result.matched} matched TORs.`,
  );
  return result;
}

async function syncBma() {
  console.log("Starting BMA e-GP2 data sync...");
  const result = await syncSource(fetchBmaTors());
  console.log(
    `BMA e-GP2 sync complete. Saved/Updated ${result.saved} of ${result.matched} matched TORs.`,
  );
  return result;
}

async function syncAllSources() {
  console.log("Starting procurement data sync...");
  // Each source owns its fetch/mapping details; this layer only coordinates saving.
  const [smeGpResult, bmaEgp2Result] = await Promise.all([
    syncSmeGp(),
    syncBma(),
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

module.exports = { syncAllSources, syncSmeGp, syncBma };
