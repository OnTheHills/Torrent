const { join } = require("node:path");
const { hydrateProjects } = require("@/services/tor/api/bmaEgp2/files");
const ocrEgp = require("@/services/tor/ocr/ocrEgp");
const ocrBmaPlans = require("@/services/tor/ocr/ocrBmaPlans");
const smeAnnouncements = require("@/services/tor/smeAnnouncement");
const torRepository = require("@/repositories/torRepository");
const torMatching = require("@/jobs/matchTors");
const classification = require("@/services/admin/classification");
const { scoreTorIds } = require("@/services/admin/scoreReviewTors");

const apiDirectory = join(__dirname, "../services/tor/api");

const ACTIVE_SOURCES = ["dataGoProcess5"];
const MANUAL_SOURCES = ["process3Process5", "dataGo", "bmaEgp2", "egpRss"];

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

  const matchTorIds = [
    ...new Set(
      (name === "dataGoProcess5"
        ? updatedTorIds
        : [...changedTorIds, ...updatedTorIds]
      )
        .filter(Boolean)
        .map(String),
    ),
  ];
  if (enqueueMatches && matchTorIds.length) await torMatching.enqueueTors(matchTorIds);

  let reviewScore = {};
  if (scoreCreated && createdTorIds.length) {
    reviewScore = await scoreTorIds(createdTorIds);
  }

  return {
    ...(result.metadata || {}),
    fetched: result.rows.length,
    matched: tors.length,
    method: selected.fetcher.method,
    ...persisted,
    ...replaced,
    ...ocr,
    ...(reviewScore.scored
      ? { reviewScored: reviewScore.scored, reviewVertexScored: reviewScore.vertexScored }
      : {}),
    source: selected.fetcher.source,
    ...(collectMatchIds
      ? { _matchTorIds: matchTorIds, _createdTorIds: createdTorIds.map(String) }
      : {}),
  };
}

async function syncAPI() {
  const results = await Promise.all(
    sources().map(({ name }) =>
      syncSource(name, { enqueueMatches: false, collectMatchIds: true, scoreCreated: false }),
    ),
  );
  const changedTorIds = [...new Set(results.flatMap((result) => result._matchTorIds || []))];
  const createdTorIds = [...new Set(results.flatMap((result) => result._createdTorIds || []))];
  if (changedTorIds.length) await torMatching.enqueueTors(changedTorIds);
  if (createdTorIds.length) await scoreTorIds(createdTorIds);
  const announcement = await smeAnnouncements.enrichStored();
  return [
    ...results.map(({ _matchTorIds, _createdTorIds, ...result }) => result),
    { source: "SME-GP", ...announcement },
  ];
}

module.exports = { sources, syncAPI, syncSource };
