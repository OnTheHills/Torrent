const { syncAPI, syncSource } = require("@/jobs/syncAPI");
const ocrBmaPlans = require("@/services/tor/ocr/ocrBmaPlans");
const torRepository = require("@/repositories/torRepository");
const torMatching = require("@/jobs/matchTors");

// Manual synchronization for both procurement APIs or one selected source.
async function triggerSyncAll(request, response) {
  try {
    const result = await syncAPI();
    return response.status(200).json({ message: "Sync successful", data: result });
  } catch (error) {
    console.error("Sync error:", error);
    return response.status(500).json({ message: error.message });
  }
}

async function triggerSmeGpSync(request, response) {
  try {
    const result = await syncSource("smeGp");
    return response.status(200).json({ message: "SME-GP sync successful", data: result });
  } catch (error) {
    console.error("SME-GP sync error:", error);
    return response.status(500).json({ message: error.message });
  }
}

async function triggerBmaEgp2Sync(request, response) {
  try {
    const result = await syncSource("bmaEgp2");
    return response.status(200).json({ message: "BMA e-GP2 sync successful", data: result });
  } catch (error) {
    console.error("BMA e-GP2 sync error:", error);
    return response.status(500).json({ message: error.message });
  }
}

async function triggerEgpRssSync(request, response) {
  try {
    const result = await syncSource("egpRss");
    return response.status(200).json({ message: "e-GP RSS sync successful", data: result });
  } catch (error) {
    console.error("e-GP RSS sync error:", error);
    return response.status(500).json({ message: error.message });
  }
}

async function triggerBmaOcr(request, response) {
  try {
    const tors = await torRepository.findBySource("BMA-EGP2");
    const result = await ocrBmaPlans.enrich(tors);
    if (result.updatedTorIds?.length) {
      // The OCR endpoint can respond once extraction is complete. Queue writes
      // continue in the background and log failures instead of failing the response.
      torMatching.enqueueTors(result.updatedTorIds)
        .catch((error) => console.error("Failed to queue BMA TOR matches:", error));
    }
    return response.status(200).json({ message: "BMA TOR PDF extract complete", data: result });
  } catch (error) {
    console.error("BMA OCR error:", error);
    return response.status(500).json({ message: error.message });
  }
}

module.exports = {
  triggerBmaEgp2Sync,
  triggerEgpRssSync,
  triggerBmaOcr,
  triggerSmeGpSync,
  triggerSync: triggerSyncAll,
  triggerSyncAll,
};
