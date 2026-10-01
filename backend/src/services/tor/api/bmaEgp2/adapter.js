const {
  DEVELOPMENT_TERMS,
  EXCLUDE_TERMS,
  IT_CONTEXT_TERMS,
  PROJECT_URL,
  SOURCE,
  STRONG_TERMS,
} = require("@/constants/bmaConstants");
const {
  budgetYearFromRef,
  budgetYearFromValue,
  classifyCategory,
  parseBudget,
} = require("@/utils/torUtils");

function containsAny(text, terms) {
  const normalized = String(text || "").toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function matchingBmaSoftwareTerms(title) {
  const name = String(title || "").toLowerCase();
  if (
    !name ||
    containsAny(name, EXCLUDE_TERMS) ||
    !/จ้าง|บำรุง|บํารุง|พัฒนา|ปรับปรุง|จัดหา|ดูแล|เช่า|ลิขสิทธิ์|ประกวด/.test(name)
  ) {
    return [];
  }
  const terms = [...STRONG_TERMS, ...DEVELOPMENT_TERMS].filter((term) =>
    name.includes(term.toLowerCase()),
  );
  return containsAny(name, STRONG_TERMS) ||
    (containsAny(name, DEVELOPMENT_TERMS) && containsAny(name, IT_CONTEXT_TERMS))
    ? terms
    : [];
}

function projectStatus(row) {
  const code = String(row.masterContractAvailableCode || "").toUpperCase();
  const name = String(row.masterContractAvailableName || "");
  if (code === "S2" || /แล้วเสร็จ|ปิดโครงการ|ยกเลิก/.test(name)) return "awarded";
  return "published";
}

// BMA project-search JSON → TOR. Dates and winner status are filled by hydrate.
function adapt(rows) {
  return rows.flatMap((row) => {
    const title = row.projectName || "";
    const terms = matchingBmaSoftwareTerms(title);
    const projectId = row.projectId;
    const refId = row.projectNumber || projectId;
    if (!terms.length || !refId || !projectId) return [];
    const department =
      row.masterOrgDepartmentName ||
      row.masterOrgGroupName ||
      "Bangkok Metropolitan Administration";
    const termList = terms.join(", ");
    return [{
      refId,
      title,
      titleTh: title,
      department,
      departmentTh: department,
      agencyId: "bma",
      source: SOURCE,
      egpUrl: `${PROJECT_URL}/${projectId}`,
      category: classifyCategory(terms),
      budgetThb: parseBudget(row.projectBudget) || undefined,
      budgetYear:
        budgetYearFromValue(row.masterBudgetYearName) ||
        budgetYearFromValue(row.masterBudgetYearId) ||
        budgetYearFromValue(row._budgetYear) ||
        budgetYearFromRef(refId),
      status: projectStatus(row),
      summary: `BMA e-GP2 project matched terms: ${termList}`,
      summaryTh: `โครงการ กทม. e-GP2 พบคำค้นหา: ${termList}`,
    }];
  });
}

module.exports = { adapt, matchingBmaSoftwareTerms };
