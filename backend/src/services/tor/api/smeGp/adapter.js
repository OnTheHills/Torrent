const {
  EXCLUDE_KEYWORDS,
  INCLUDE_KEYWORDS,
  SOURCE,
  WEBSITE_URL,
} = require("@/constants/smeGpConstants");
const { classifyCategory, parseBudget } = require("@/utils/torUtils");

function compactText(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function matchingKeyword(title) {
  const normalizedTitle = compactText(title);
  if (!normalizedTitle || EXCLUDE_KEYWORDS.some((term) => normalizedTitle.includes(compactText(term)))) return null;
  return INCLUDE_KEYWORDS.find((term) => normalizedTitle.includes(compactText(term))) || null;
}

// Convert SME-GP rows to the MongoDB TOR contract; no network or database work belongs here.
function adapt(rows) {
  const candidates = new Map();
  // A project can appear in several search-term responses.
  rows.forEach((row) => candidates.set(row._id || row.link || JSON.stringify(row), row));

  return [...candidates.values()].flatMap((candidate) => {
    const keyword = matchingKeyword(candidate.title);
    const refId = candidate._id || candidate.project_id || candidate.link;
    if (!keyword || !refId) return [];
    return [{
      refId,
      title: candidate.title,
      titleTh: candidate.title,
      department: candidate.deptName,
      departmentTh: candidate.deptName,
      agencyId: candidate.deptsubName || "sme-gp",
      publishedAt: candidate.published ? new Date(candidate.published) : undefined,
      source: SOURCE,
      egpUrl: candidate.link || WEBSITE_URL,
      category: classifyCategory(keyword),
      budgetThb: parseBudget(candidate.budget),
      status: "published",
      summary: `Matched keyword: ${keyword}`,
      summaryTh: `พบคำค้นหา: ${keyword}`,
    }];
  });
}

module.exports = { adapt, matchingKeyword };
