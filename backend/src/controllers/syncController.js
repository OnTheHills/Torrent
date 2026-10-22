const { syncAPI, syncSource } = require("@/jobs/syncAPI");
const ocrEgp = require("@/services/tor/ocr/ocrEgp");
const torRepository = require("@/repositories/torRepository");
const torMatching = require("@/jobs/matchTors");

async function run(response, work) {
  try {
    return response.status(200).json({ message: "Sync successful", data: await work() });
  } catch (error) {
    console.error("Sync error:", error);
    return response.status(502).json({ message: error.message });
  }
}

function triggerSyncAll(request, response) {
  return run(response, syncAPI);
}

function triggerProcessSync(request, response) {
  return run(response, () => syncSource("process3Process5"));
}

function triggerDataGoProcess5Sync(request, response) {
  return run(response, () => syncSource("dataGoProcess5"));
}

function triggerEgpOcr(request, response) {
  return run(response, async () => {
    const tors = await torRepository.findBySource("EGP-PROCESS5");
    const result = await ocrEgp.enrich(tors);
    if (result.updatedTorIds?.length) await torMatching.enqueueTors(result.updatedTorIds);
    return result;
  });
}

module.exports = { triggerSyncAll, triggerProcessSync, triggerDataGoProcess5Sync, triggerEgpOcr };
