const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { hydrateProjects } = require("@/services/tor/api/bmaEgp2/files");
const smeAnnouncements = require("@/services/tor/api/smeGp/announcement");
const ocrBmaPlans = require("@/services/tor/ocr/ocrBmaPlans");
const torRepository = require("@/repositories/torRepository");

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

async function syncSource(name) {
  const source = sources().find((candidate) => candidate.name === name);
  if (!source) throw new Error(`Unknown API source: ${name}`);
  const result = await source.fetcher.fetch();
  const matched = source.adapter.adapt(result.rows);
  const tors = name === "bmaEgp2" ? await hydrateProjects(matched) : matched;
  const announcement = name === "smeGp" ? await smeAnnouncements.enrich(tors) : {};
  const persisted = await save(tors);
  const replaced =
    name === "bmaEgp2" && result.rows.length
      ? await torRepository.deleteMissingFromSource(
          source.fetcher.source,
          tors.map((tor) => tor.refId),
        )
      : {};
  const ocr = name === "bmaEgp2" ? await ocrBmaPlans.enrich(tors) : {};
  return {
    ...(result.metadata || {}),
    fetched: result.rows.length,
    matched: tors.length,
    method: source.fetcher.method,
    ...persisted,
    ...replaced,
    ...announcement,
    ...ocr,
    source: source.fetcher.source,
  };
}

async function syncAPI() {
  return Promise.all(sources().map(({ name }) => syncSource(name)));
}

module.exports = { sources, syncAPI, syncSource };
