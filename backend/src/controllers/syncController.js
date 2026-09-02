const smeGp = require("../utils/smeGp");

/**
 * Controller to manually trigger the synchronization of TOR data from SME-GP.
 * It calls the utility function and returns the results of the sync operation.
 */
async function triggerSync(request, response) {
  try {
    const result = await smeGp.syncSmeGpData();
    return response.status(200).json({ message: "Sync successful", data: result });
  } catch (error) {
    console.error("Sync error:", error);
    return response.status(500).json({ message: error.message });
  }
}

module.exports = {
  triggerSync,
};
