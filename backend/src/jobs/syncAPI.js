const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { hydrateProjects } = require("@/services/tor/api/bmaEgp2/files");
const ocrBmaPlans = require("@/services/tor/ocr/ocrBmaPlans");
const torRepository = require("@/repositories/torRepository");
const torMatching = require("@/jobs/matchTors");

const apiDirectory = join(__dirname, "../services/tor/api");

// Find fetchers so adding api/<name>/fetch.js automatically adds it to the job.
function sources() {
  return readdirSync(apiDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      fetcher: require(join(apiDirectory, entry.name, "fetch")),
      adapter: require(join(apiDirectory, entry.name, "adapter")),
    }));
}

async function save(tors) {
  // Persistence decides whether each fetched TOR is new, changed, or unchanged.
  return torRepository.saveChanged(tors);
}

async function syncSource(name, { enqueueMatches = true, collectMatchIds = false } = {}) {
  const source = sources().find((candidate) => candidate.name === name);
  if (!source) throw new Error(`Unknown API source: ${name}`);
  const result = await source.fetcher.fetch();
  const matched = source.adapter.adapt(result.rows);
  const tors = name === "bmaEgp2" ? await hydrateProjects(matched) : matched;
  const { changedTorIds = [], ...persisted } = await save(tors);
  const replaced =
    name === "bmaEgp2" && result.rows.length
      ? await torRepository.deleteMissingFromSource(
          source.fetcher.source,
          tors.map((tor) => tor.refId),
        )
      : {};
  const { updatedTorIds = [], ...ocr } = name === "bmaEgp2" ? await ocrBmaPlans.enrich(tors) : {};
  const matchTorIds = [...new Set([...changedTorIds, ...updatedTorIds].filter(Boolean).map(String))];
  if (enqueueMatches && matchTorIds.length) await torMatching.enqueueTors(matchTorIds);
  return {
    ...(result.metadata || {}),
    fetched: result.rows.length,
    matched: tors.length,
    method: source.fetcher.method,
    ...persisted,
    ...replaced,
    ...ocr,
    source: source.fetcher.source,
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
