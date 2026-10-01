const { INCLUDE_KEYWORDS, EXCLUDE_KEYWORDS } = require("@/constants/smeGpConstants");
const { SOURCE } = require("@/constants/egpRssConstants");
const { classifyCategory, parseDate } = require("@/utils/torUtils");

function compactText(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function matchingKeyword(title) {
  const normalizedTitle = compactText(title);
  if (!normalizedTitle || EXCLUDE_KEYWORDS.some((term) => normalizedTitle.includes(compactText(term)))) {
    return null;
  }
  return INCLUDE_KEYWORDS.find((term) => normalizedTitle.includes(compactText(term))) || null;
}

const STAGE_RANK = { draft: 1, published: 2, awarded: 3 };

function mergeKey(row) {
  return `${row.deptId || ""}:${compactText(row.title)}`;
}

// Convert official e-GP RSS items to the MongoDB TOR contract.
function adapt(rows) {
  const merged = new Map();

  for (const row of rows) {
    const keyword = matchingKeyword(row.title);
    const refId = row.guid || row.link;
    if (!keyword || !refId) continue;
    const status = row.status || "draft";
    const next = {
      refId,
      title: row.title,
      titleTh: row.title,
      department: row.department || "e-GP",
      departmentTh: row.department || "e-GP",
      agencyId: row.agencyId || "mdes",
      publishedAt: parseDate(row.publishedAt),
      source: SOURCE,
      egpUrl: row.link || row.guid,
      category: classifyCategory(keyword),
      budgetThb: row.budgetThb || undefined,
      budgetYear: row.budgetYear,
      status,
      summary: `e-GP RSS matched terms: ${keyword}`,
      summaryTh: `RSS e-GP พบคำค้นหา: ${keyword}`,
      _merge: mergeKey(row),
      _rank: STAGE_RANK[status] || 0,
    };
    const current = merged.get(next._merge);
    if (!current || next._rank >= current._rank) merged.set(next._merge, next);
  }

  return [...merged.values()].map(({ _merge, _rank, ...tor }) => tor);
}

module.exports = { adapt, matchingKeyword };
