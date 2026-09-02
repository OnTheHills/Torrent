const smeGp = require("../utils/smeGp");

/**
 * Controller to manually trigger the synchronization of TOR data from SME-GP.
 * It calls the utility function and returns the results of the sync operation.
 */
async function triggerSyncAll(request, response) {
  try {
    const result = await smeGp.syncProcurementData();
    return response.status(200).json({ message: "Sync successful", data: result });
  } catch (error) {
    console.error("Sync error:", error);
    return response.status(500).json({ message: error.message });
  }
}

async function triggerSmeGpSync(request, response) {
  try {
    const result = await smeGp.syncSmeGpOnly();
    return response.status(200).json({ message: "SME-GP sync successful", data: result });
  } catch (error) {
    console.error("SME-GP sync error:", error);
    return response.status(500).json({ message: error.message });
  }
}

async function triggerBmaEgp2Sync(request, response) {
  try {
    const result = await smeGp.syncBmaEgp2Only();
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
