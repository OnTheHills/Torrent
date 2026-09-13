const { syncAPI, syncSource } = require("@/jobs/syncAPI");

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

module.exports = {
  triggerBmaEgp2Sync,
  triggerSmeGpSync,
  triggerSync: triggerSyncAll,
  triggerSyncAll,
};
