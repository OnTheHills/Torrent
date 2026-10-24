const AdminSettings = require("@/models/AdminSettings");
const { INCLUDE_KEYWORDS, EXCLUDE_KEYWORDS } = require("@/constants/dataGoConstants");
const { matchingSoftwareTerms } = require("@/services/tor/api/dataGo/adapter");

const DEFAULTS = {
  includeKeywords: INCLUDE_KEYWORDS,
  excludeKeywords: EXCLUDE_KEYWORDS,
  autoThreshold: 90,
  reviewThreshold: 80,
};

function cleanList(value, fallback) {
  const list = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
  return list.length ? [...new Set(list)] : fallback;
}

async function readSettings() {
  const doc = await AdminSettings.findOne({ key: "ops" }).lean();
  return {
    includeKeywords: doc?.includeKeywords?.length ? doc.includeKeywords : DEFAULTS.includeKeywords,
    excludeKeywords: doc?.excludeKeywords?.length ? doc.excludeKeywords : DEFAULTS.excludeKeywords,
    autoThreshold: Number.isFinite(doc?.autoThreshold) ? doc.autoThreshold : DEFAULTS.autoThreshold,
    reviewThreshold: Number.isFinite(doc?.reviewThreshold) ? doc.reviewThreshold : DEFAULTS.reviewThreshold,
    updatedAt: doc?.updatedAt || null,
  };
}

async function activeRules() {
  const settings = await readSettings();
  return {
    includeKeywords: settings.includeKeywords,
    excludeKeywords: settings.excludeKeywords,
    autoThreshold: settings.autoThreshold,
    reviewThreshold: settings.reviewThreshold,
  };
}

function compareTitles(titles, current, next) {
  const added = [];
  const removed = [];
  let currentMatch = 0;
  let nextMatch = 0;
  for (const title of titles) {
    const before = matchingSoftwareTerms(title, current).length > 0;
    const after = matchingSoftwareTerms(title, next).length > 0;
    if (before) currentMatch += 1;
    if (after) nextMatch += 1;
    if (!before && after) added.push(title);
    if (before && !after) removed.push(title);
  }
  return {
    currentMatch,
    nextMatch,
    added: added.length,
    removed: removed.length,
    sampleAdded: added.slice(0, 8),
    sampleRemoved: removed.slice(0, 8),
  };
}

module.exports = {
  DEFAULTS,
  activeRules,
  cleanList,
  compareTitles,
  readSettings,
};
