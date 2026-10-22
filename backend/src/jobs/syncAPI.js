const { join } = require("node:path");
const ocrEgp = require("@/services/tor/ocr/ocrEgp");
const torRepository = require("@/repositories/torRepository");
const torMatching = require("@/jobs/matchTors");

const apiDirectory = join(__dirname, "../services/tor/api");

const ACTIVE_SOURCES = ["dataGoProcess5"];

function source(name) {
  return ({
    name,
    fetcher: require(join(apiDirectory, name, "fetch")),
    adapter: require(join(apiDirectory, name, "adapter")),
  });
}

function sources() {
  return ACTIVE_SOURCES.map(source);
}

async function save(tors) {
  // Persistence decides whether each fetched TOR is new, changed, or unchanged.
  return torRepository.saveChanged(tors);
}

async function syncSource(name, { enqueueMatches = true, collectMatchIds = false } = {}) {
  if (![...ACTIVE_SOURCES, "process3Process5"].includes(name)) throw new Error(`Unknown API source: ${name}`);
  const selected = source(name);
  let result;
  try {
    result = await selected.fetcher.fetch();
  } catch (error) {
    if (name !== "dataGoProcess5" || !/data\.go discovery failed: data\.go API HTTP 429/.test(error.message)) throw error;
    result = { rows: [], metadata: { discoveryError: error.message, rateLimited: true } };
  }
  const matched = selected.adapter.adapt(result.rows);
  const tors = matched;
  const { changedTorIds = [], ...persisted } = await save(tors);
  const ocrCandidates = name === "dataGoProcess5"
    ? await torRepository.findBySource("EGP-PROCESS5")
    : tors;
  const { updatedTorIds = [], ...ocr } = await ocrEgp.enrich(ocrCandidates);
  const matchTorIds = [...new Set((name === "dataGoProcess5" ? updatedTorIds : [...changedTorIds, ...updatedTorIds])
    .filter(Boolean).map(String))];
  if (enqueueMatches && matchTorIds.length) await torMatching.enqueueTors(matchTorIds);
  return {
    ...(result.metadata || {}),
    fetched: result.rows.length,
    matched: tors.length,
    method: selected.fetcher.method,
    ...persisted,
    ...ocr,
    source: selected.fetcher.source,
    ...(collectMatchIds ? { _matchTorIds: matchTorIds } : {}),
  };
}

async function syncAPI() {
  const results = await Promise.all(
    sources().map(({ name }) => syncSource(name, { enqueueMatches: false, collectMatchIds: true })),
  );
  const changedTorIds = [...new Set(results.flatMap((result) => result._matchTorIds || []))];
  if (changedTorIds.length) await torMatching.enqueueTors(changedTorIds);
  return results.map(({ _matchTorIds, ...result }) => result);
}

module.exports = { sources, syncAPI, syncSource };
