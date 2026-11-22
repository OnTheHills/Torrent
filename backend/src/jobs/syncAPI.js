const { join } = require("node:path");
const { hydrateProjects } = require("@/services/tor/api/bmaEgp2/files");
const ocrEgp = require("@/services/tor/ocr/ocrEgp");
const ocrBmaPlans = require("@/services/tor/ocr/ocrBmaPlans");
const smeAnnouncements = require("@/services/tor/smeAnnouncement");
const { mergeByRefIds, reconcileAll } = require("@/services/tor/mergeDuplicateTors");
const torRepository = require("@/repositories/tor/torRepository");
const torMatching = require("@/jobs/matchTors");
const classification = require("@/services/admin/classification");
const { scoreTorIds } = require("@/services/admin/scoreReviewTors");
const { errorFields, logger, safeErrorSummary } = require("@/utils/logger");

const apiDirectory = join(__dirname, "../services/tor/api");

const ACTIVE_SOURCES = ["dataGoProcess5"];
const MANUAL_SOURCES = ["process3Process5", "dataGo", "bmaEgp2", "egpRss"];
// Keep the admin batch unchanged; automatic ingestion also visits every alternate feed.
const AUTOMATIC_SOURCES = [...ACTIVE_SOURCES, ...MANUAL_SOURCES];

function source(name) {
  return {
    name,
    fetcher: require(join(apiDirectory, name, "fetch")),
    adapter: require(join(apiDirectory, name, "adapter")),
  };
}

function sources() {
  return ACTIVE_SOURCES.map(source);
}

async function save(tors) {
  // Persistence decides whether each fetched TOR is new, changed, or unchanged.
  return torRepository.saveChanged(tors);
}

async function syncSource(name, {
  enqueueMatches = true,
  collectMatchIds = false,
  scoreCreated = true,
} = {}) {
  if (![...ACTIVE_SOURCES, ...MANUAL_SOURCES].includes(name)) {
    throw new Error(`Unknown API source: ${name}`);
  }
  const selected = source(name);
  let result;
  try {
    result = await selected.fetcher.fetch();
  } catch (error) {
    if (name !== "dataGoProcess5" || !/data\.go discovery failed: data\.go API HTTP 429/.test(error.message)) {
      throw error;
    }
    result = { rows: [], metadata: { discoveryError: error.message, rateLimited: true } };
  }
  const rules = name === "dataGo" ? await classification.activeRules() : null;
  const matched = selected.adapter.adapt(result.rows, rules);
  const tors = name === "bmaEgp2" ? await hydrateProjects(matched) : matched;
  const { changedTorIds = [], createdTorIds = [], ...persisted } = await save(tors);
  const replaced =
    name === "bmaEgp2" && result.rows.length
      ? await torRepository.deleteMissingFromSource(
          selected.fetcher.source,
          tors.map((tor) => tor.refId),
        )
      : {};

  let updatedTorIds = [];
  let ocr = {};
  if (name === "dataGoProcess5" || name === "process3Process5") {
    const ocrCandidates =
      name === "dataGoProcess5"
        ? await torRepository.findBySource("EGP-PROCESS5")
        : tors;
    ({ updatedTorIds = [], ...ocr } = await ocrEgp.enrich(ocrCandidates));
  } else if (name === "bmaEgp2") {
    ({ updatedTorIds = [], ...ocr } = await ocrBmaPlans.enrich(tors));
  }

  // Cross-source merge after OCR so deadline/document richness is available for conflict detection.
  const merge = await mergeByRefIds(tors.map((tor) => tor.refId));
  const mergedSurvivorIds = merge.survivorIds.map(String);
  const absorbedIdSet = new Set(merge.absorbedIds.map(String));

  const matchTorIds = [
    ...new Set(
      (name === "dataGoProcess5"
        ? [...updatedTorIds, ...mergedSurvivorIds]
        : [...changedTorIds, ...updatedTorIds, ...mergedSurvivorIds]
      )
        .filter(Boolean)
        .map(String)
        .filter((id) => !absorbedIdSet.has(id)),
    ),
  ];
  if (enqueueMatches && matchTorIds.length) await torMatching.enqueueTors(matchTorIds);

  // Score new rows only. Skip conflicted merge survivors so scoring does not wipe conflict reasons.
  const conflictedIdSet = new Set(merge.conflictedSurvivorIds.map(String));
  let reviewScore = {};
  if (scoreCreated) {
    const idsToScore = createdTorIds
      .map(String)
      .filter((id) => !absorbedIdSet.has(id) && !conflictedIdSet.has(id));
    if (idsToScore.length) reviewScore = await scoreTorIds(idsToScore);
  }

  return {
    ...(result.metadata || {}),
    fetched: result.rows.length,
    matched: tors.length,
    method: selected.fetcher.method,
    ...persisted,
    ...replaced,
    ...ocr,
    mergeGroups: merge.groups,
    mergeMerged: merge.merged,
    mergeConflicted: merge.conflicted,
    ...(reviewScore.scored
      ? { reviewScored: reviewScore.scored, reviewVertexScored: reviewScore.vertexScored }
      : {}),
    source: selected.fetcher.source,
    ...(collectMatchIds
      ? { _matchTorIds: matchTorIds, _createdTorIds: createdTorIds.map(String) }
      : {}),
  };
}

async function syncAPI({ automatic = false } = {}) {
  const options = { enqueueMatches: false, collectMatchIds: true, scoreCreated: false };
  let results;
  if (automatic) {
    results = [];
    // The process5 paths share records and OCR. Finish each source before the next
    // can update or merge those records, and keep going if an alternate feed fails.
    for (const name of AUTOMATIC_SOURCES) {
      try {
        results.push({ ...await syncSource(name, options), sourceKey: name, status: "success" });
      } catch (error) {
        logger.error("sync.source.failed", { source: name, ...errorFields(error) });
        results.push({
          source: source(name).fetcher.source,
          sourceKey: name,
          status: "failed",
          error: safeErrorSummary(error),
          fetched: 0,
        });
      }
    }
  } else {
    results = await Promise.all(sources().map(({ name }) => syncSource(name, options)));
  }
  // Catch any remaining cross-source twins after the active sync batch.
  const reconcile = await reconcileAll();
  const conflictedIdSet = new Set((reconcile.conflictedSurvivorIds || []).map(String));
  const absorbedIdSet = new Set((reconcile.absorbedIds || []).map(String));
  const changedTorIds = [
    ...new Set([
      ...results.flatMap((result) => result._matchTorIds || []),
      ...(reconcile.survivorIds || []).map(String),
    ]),
  ].filter((id) => !absorbedIdSet.has(id));
  const createdTorIds = [...new Set(results.flatMap((result) => result._createdTorIds || []))];
  if (changedTorIds.length) await torMatching.enqueueTors(changedTorIds);
  const scoreIds = createdTorIds.filter((id) => !conflictedIdSet.has(String(id)) && !absorbedIdSet.has(String(id)));
  if (scoreIds.length) await scoreTorIds(scoreIds);
  const announcement = await smeAnnouncements.enrichStored();
  return [
    ...results.map(({ _matchTorIds, _createdTorIds, ...result }) => result),
    { source: "TOR-MERGE", ...reconcile },
    { source: "SME-GP", ...announcement, ...(automatic ? { status: "success" } : {}) },
  ];
}

module.exports = { sources, syncAPI, syncSource };
