const {
  EXCLUDE_KEYWORDS,
  INCLUDE_KEYWORDS,
  SOURCE,
  WEBSITE_URL,
} = require("@/constants/smeGpConstants");
const { classifyCategory, firstPresent, parseBudget, parseDate } = require("@/utils/torUtils");

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
    const link = candidate.link || "";
    // SME-GP's link is the announcement PDF, not the e-GP project page.
    const pdfUrl = /view-pdf|\.pdf(?:$|\?)/i.test(link) ? link : "";
    return [{
      refId,
      title: candidate.title,
      titleTh: candidate.title,
      department: candidate.deptName,
      departmentTh: candidate.deptName,
      agencyId: candidate.deptsubName || "sme-gp",
      publishedAt: parseDate(candidate.published),
      deadline: parseDate(
        firstPresent(
          candidate.deadline,
          candidate.closeDate,
          candidate.endDate,
          candidate.submitEnd,
        ),
      ),
      source: SOURCE,
      egpUrl: pdfUrl ? undefined : link || WEBSITE_URL,
      torPdfPath: pdfUrl || undefined,
      category: classifyCategory(keyword),
      budgetThb: parseBudget(
        firstPresent(
          candidate.budget,
          candidate.project_money,
          candidate.price,
          candidate.budgetThb,
        ),
      ) || undefined,
      status: "published",
      summary: `Matched keyword: ${keyword}`,
      summaryTh: `พบคำค้นหา: ${keyword}`,
    }];
  });
}

module.exports = { adapt, matchingKeyword };
