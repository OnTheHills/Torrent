const {
  DEVELOPMENT_TERMS,
  EXCLUDE_TERMS,
  IT_CONTEXT_TERMS,
  PLAN_URL,
  SOURCE,
  STRONG_TERMS,
} = require("@/constants/bmaConstants");
const { classifyCategory, parseBudget } = require("@/utils/torUtils");

function containsAny(text, terms) {
  const normalized = String(text || "").toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function matchingBmaSoftwareTerms(title) {
  const name = String(title || "").toLowerCase();
  if (!name || containsAny(name, EXCLUDE_TERMS) || !/จ้าง|บำรุง|บํารุง|พัฒนา|ปรับปรุง|จัดหา|ดูแล|เช่า|ลิขสิทธิ์/.test(name)) return [];
  const terms = [...STRONG_TERMS, ...DEVELOPMENT_TERMS].filter((term) => name.includes(term.toLowerCase()));
  return containsAny(name, STRONG_TERMS) || (containsAny(name, DEVELOPMENT_TERMS) && containsAny(name, IT_CONTEXT_TERMS)) ? terms : [];
}

// This is the BMA-specific JSON-to-TOR boundary. Keep source field names here.
function adapt(rows) {
  return rows.flatMap((row) => {
    const terms = matchingBmaSoftwareTerms(row.planProjectPlanProjectName);
    if (!terms.length) return [];
    const planId = row.planProjectId || row.planProjectPlanProjectsCode;
    const refId = row.planProjectPlanProjectsCode || planId;
    if (!refId) return [];
    const title = row.planProjectPlanProjectName || "Untitled procurement plan";
    const department = row.masterOrgDepartmentName || row.masterOrgGroupName || "Bangkok Metropolitan Administration";
    const termList = terms.join(", ");
    return [{
      refId,
      title,
      titleTh: title,
      department,
      departmentTh: department,
      agencyId: "bma",
      publishedAt: row.planProjectAnnounceDate ? new Date(row.planProjectAnnounceDate) : undefined,
      source: SOURCE,
      egpUrl: planId ? `${PLAN_URL}/${planId}` : PLAN_URL,
      category: classifyCategory(terms),
      budgetThb: parseBudget(row.planProjectBudget),
      status: "published",
      summary: `BMA e-GP2 plan matched terms: ${termList}`,
      summaryTh: `แผนจัดซื้อจัดจ้าง กทม. e-GP2 พบคำค้นหา: ${termList}`,
    }];
  });
}

module.exports = { adapt, matchingBmaSoftwareTerms };
