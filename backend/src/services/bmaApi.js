const {
  API_URL,
  RETRY_COUNT,
  SOURCE,
  METHOD,
  USER_AGENT,
  PLAN_URL,
  BUDGET_YEAR,
  PAGE_SIZE,
  STRONG_TERMS,
  DEVELOPMENT_TERMS,
  IT_CONTEXT_TERMS,
  EXCLUDE_TERMS,
} = require("../constants/bmaConstants");
const {
  classifyCategory,
  parseBudget,
  wait,
} = require("../utils/torUtils");

// This adapter is separate from SME-GP because e-GP2 exposes a different GET API
// and response shape even though both sources become the same TOR document later.


function containsAny(text, terms) {
  const normalizedText = (text || "").toString().toLowerCase();
  return terms.some((term) => normalizedText.includes(term.toLowerCase()));
}

function matchedBmaTerms(text) {
  const normalizedText = (text || "").toString().toLowerCase();
  return [...STRONG_TERMS, ...DEVELOPMENT_TERMS].filter((term) =>
    normalizedText.includes(term.toLowerCase()),
  );
}

function matchingBmaSoftwareTerms(title) {
  const name = (title || "").toString().toLowerCase();
  if (!name || containsAny(name, EXCLUDE_TERMS)) return [];

  // BMA plans are broad, so require a procurement verb before applying IT keywords.
  const hasProcurementVerb =
    /จ้าง|บำรุง|บํารุง|พัฒนา|ปรับปรุง|จัดหา|ดูแล|เช่า|ลิขสิทธิ์/.test(name);
  if (!hasProcurementVerb) return [];

  const terms = matchedBmaTerms(name);
  if (containsAny(name, STRONG_TERMS)) return terms;

  if (containsAny(name, DEVELOPMENT_TERMS) && containsAny(name, IT_CONTEXT_TERMS)) {
    return terms;
  }

  return [];
}

// Map BMA's plan field names once at the system boundary; UI and database code
// then work only with the project's common TOR field names.
function mapBmaProject(row, matchedTerms) {
  const planId = row.planProjectId || row.planProjectPlanProjectsCode;
  const title = row.planProjectPlanProjectName || "Untitled procurement plan";
  const department =
    row.masterOrgDepartmentName ||
    row.masterOrgGroupName ||
    "Bangkok Metropolitan Administration";
  const termList = matchedTerms.length ? matchedTerms.join(", ") : "software";

  return {
    refId: row.planProjectPlanProjectsCode || `BMA-EGP2-${planId}`,
    title,
    titleTh: title,
    department,
    departmentTh: department,
    agencyId: "bma",
    publishedAt: row.planProjectAnnounceDate
      ? new Date(row.planProjectAnnounceDate)
      : new Date(),
    source: SOURCE,
    egpUrl: planId ? `${PLAN_URL}/${planId}` : PLAN_URL,
    category: classifyCategory(matchedTerms),
    budgetThb: parseBudget(row.planProjectBudget),
    status: "published",
    summary: `BMA e-GP2 plan matched terms: ${termList}`,
    summaryTh: `แผนจัดซื้อจัดจ้าง กทม. e-GP2 พบคำค้นหา: ${termList}`,
  };
}

async function fetchBmaProjects({
  budgetYear = BUDGET_YEAR,
  pageSize = PAGE_SIZE,
  retries = RETRY_COUNT,
} = {}) {
  const rows = [];
  let pageNo = 1;
  let pageCount = 1;

  while (pageNo <= pageCount) {
    // The BMA e-GP2 API exposes pages behind the SPA, with pageCount in each response.
    const url = new URL(API_URL);
    url.searchParams.set("pageNo", pageNo.toString());
    url.searchParams.set("pageSize", pageSize.toString());
    url.searchParams.set("sortBy", "announcedatedesc");
    url.searchParams.set("masterBudgetYearId", budgetYear);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          method: METHOD,
          headers: {
            Accept: "application/json, text/plain, */*",
            Referer: `${PLAN_URL}?budgetYear=${budgetYear}`,
            "User-Agent": USER_AGENT,
          },
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const result = await res.json();
        rows.push(...(result.data || []));
        pageCount = Math.max(parseInt(result.pageCount || 1, 10), 1);
        break;
      } catch (error) {
        if (attempt === retries) {
          console.error(
            `Failed to fetch BMA e-GP2 page ${pageNo}: ${error.message}`,
          );
        } else {
          await wait(attempt * 1000);
        }
      }
    }

    pageNo++;
  }

  return rows;
}

async function fetchBmaTors() {
  const rows = await fetchBmaProjects();
  const tors = rows
    .map((row) => {
      const matchedTerms = matchingBmaSoftwareTerms(row.planProjectPlanProjectName);
      return matchedTerms.length > 0 ? mapBmaProject(row, matchedTerms) : null;
    })
    .filter(Boolean);

  return {
    budgetYear: BUDGET_YEAR,
    fetched: rows.length,
    method: METHOD,
    source: SOURCE,
    tors,
  };
}

module.exports = {
  fetchBmaTors,
  fetchBmaProjects,
  mapBmaProject,
  matchingBmaSoftwareTerms,
  method: METHOD,
  source: SOURCE,
};
