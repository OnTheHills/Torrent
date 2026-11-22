const { syncAPI, syncSource } = require("@/jobs/syncAPI");
const smeAnnouncements = require("@/services/tor/smeAnnouncement");
const ocrEgp = require("@/services/tor/ocr/ocrEgp");
const ocrBmaPlans = require("@/services/tor/ocr/ocrBmaPlans");
const torRepository = require("@/repositories/tor/torRepository");
const torMatching = require("@/jobs/matchTors");
const syncRuns = require("@/services/admin/syncRuns");
const { errorFields, logger, safeErrorSummary } = require("@/utils/logger");

async function logged(request, response, sourceKey, user, work, message) {
  let run;
  try {
    run = await syncRuns.start(sourceKey, user, "manual", request.requestId);
  } catch (error) {
    logger.error("sync.run.record_start_failed", { source: sourceKey, ...errorFields(error) });
    return response.status(500).json({ message: "Sync could not be started." });
  }
  try {
    const data = await work();
    await syncRuns.finish(run, { status: "success", summary: data });
    return response.status(200).json({ message, data });
  } catch (error) {
    logger.error("sync.run.failed", { source: sourceKey, ...errorFields(error) });
    await syncRuns.finish(run, { status: "failed", error: safeErrorSummary(error) }).catch(() => {});
    return response.status(500).json({ message: "Sync failed." });
  }
}

async function triggerSyncAll(request, response) {
  return logged(request, response, "all", request.user, () => syncAPI(), "Sync successful");
}

async function triggerProcessSync(request, response) {
  return logged(
    request,
    response,
    "process3Process5",
    request.user,
    () => syncSource("process3Process5"),
    "Process3/Process5 sync successful",
  );
}

async function triggerDataGoProcess5Sync(request, response) {
  return logged(
    request,
    response,
    "dataGoProcess5",
    request.user,
    () => syncSource("dataGoProcess5"),
    "data.go Process5 sync successful",
  );
}

async function triggerBmaEgp2Sync(request, response) {
  return logged(request, response, "bmaEgp2", request.user, () => syncSource("bmaEgp2"), "BMA e-GP2 sync successful");
}

async function triggerEgpRssSync(request, response) {
  return logged(request, response, "egpRss", request.user, () => syncSource("egpRss"), "e-GP RSS sync successful");
}

async function triggerDataGoSync(request, response) {
  return logged(request, response, "dataGo", request.user, () => syncSource("dataGo"), "data.go e-GP sync successful");
}

async function triggerSmeAnnouncements(request, response) {
  return logged(
    request,
    response,
    "smeAnnouncements",
    request.user,
    () => smeAnnouncements.enrichStored(),
    "SME-GP announcement budgets extracted",
  );
}

async function triggerEgpOcr(request, response) {
  return logged(request, response, "egpOcr", request.user, async () => {
    const tors = await torRepository.findBySource("EGP-PROCESS5");
    const result = await ocrEgp.enrich(tors);
    if (result.updatedTorIds?.length) await torMatching.enqueueTors(result.updatedTorIds);
    return result;
  }, "e-GP TOR extract complete");
}

async function triggerBmaOcr(request, response) {
  return logged(request, response, "bmaOcr", request.user, async () => {
    const tors = await torRepository.findBySource("BMA-EGP2");
    const result = await ocrBmaPlans.enrich(tors);
    if (result.updatedTorIds?.length) {
      torMatching.enqueueTors(result.updatedTorIds)
        .catch((error) => logger.error("tor_matching.enqueue_after_ocr_failed", errorFields(error)));
    }
    return result;
  }, "BMA TOR PDF extract complete");
}

module.exports = {
  triggerSyncAll,
  triggerProcessSync,
  triggerDataGoProcess5Sync,
  triggerEgpOcr,
  triggerBmaEgp2Sync,
  triggerEgpRssSync,
  triggerBmaOcr,
  triggerDataGoSync,
  triggerSmeAnnouncements,
  triggerSync: triggerSyncAll,
};
