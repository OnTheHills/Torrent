const {
  EXCLUDE_KEYWORDS,
  INCLUDE_KEYWORDS,
  PROJECT_SEARCH_URL,
  SOFTWARE_CONTEXT_KEYWORDS,
  SOURCE,
  SYSTEM_ACTION_KEYWORDS,
} = require("@/constants/dataGoConstants");
const { classifyCategory, parseBudget, parseDate, latinDigits } = require("@/utils/torUtils");

const THAI_MONTHS = {
  มค: 0, กพ: 1, มีค: 2, เมย: 3, พค: 4, มิย: 5,
  กค: 6, สค: 7, กย: 8, ตค: 9, พย: 10, ธค: 11,
};

function parseEgpDate(value) {
  const direct = parseDate(value);
  if (direct) return direct;

  const match = latinDigits(value).match(/^\s*(\d{1,2})\s+([ก-๙.]+)\s+(\d{2,4})\s*$/);
  if (!match) return undefined;
  const month = THAI_MONTHS[match[2].replace(/[.\s]/g, "")];
  if (month === undefined) return undefined;
  let year = Number(match[3]);
  if (year < 100) year += 2500;
  if (year > 2400) year -= 543;
  const date = new Date(year, month, Number(match[1]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function matchingSoftwareTerms(title) {
  const name = String(title || "").toLowerCase();
  if (!name || EXCLUDE_KEYWORDS.some((term) => name.includes(term.toLowerCase()))) return [];

  const directMatches = INCLUDE_KEYWORDS.filter((term) => name.includes(term.toLowerCase()));
  const systemActions = SYSTEM_ACTION_KEYWORDS.filter((term) => name.includes(term.toLowerCase()));
  const hasSoftwareContext = SOFTWARE_CONTEXT_KEYWORDS.some((term) => name.includes(term.toLowerCase()));
  if (directMatches.length) return directMatches;
  if (systemActions.length && hasSoftwareContext) return systemActions;
  return [];
}

function adapt(rows = []) {
  const projects = new Map();
  for (const row of rows) {
    const projectId = String(row.project_id || "");
    const title = String(row.project_name || "").trim();
    const terms = matchingSoftwareTerms(title);
    if (!projectId || !terms.length) continue;
    projects.set(projectId, {
      refId: projectId,
      title,
      titleTh: title,
      department: row.dept_sub_name || row.dept_name || "e-GP",
      departmentTh: row.dept_name || row.dept_sub_name || "e-GP",
      agencyId: "egp",
      publishedAt: parseEgpDate(row.announce_date || row.transaction_date),
      source: SOURCE,
      egpUrl: `${PROJECT_SEARCH_URL}?keywordSearch=${encodeURIComponent(projectId)}`,
      category: classifyCategory(title),
      budgetThb: parseBudget(row.project_money) || undefined,
      budgetYear: String(row.year || "") || undefined,
      status: row.contract?.length ? "awarded" : "published",
      summary: `data.go e-GP matched software terms: ${terms.join(", ")}`,
      summaryTh: `data.go e-GP พบคำค้นซอฟต์แวร์: ${terms.join(", ")}`,
    });
  }
  return [...projects.values()];
}

module.exports = { adapt, matchingSoftwareTerms, parseEgpDate };
