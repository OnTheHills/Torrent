const {
  ANNOUNCE_TYPES,
  API_URL,
  BUDGET_YEARS,
  METHOD,
  PAGE_SIZE,
  RETRY_COUNT,
  SEARCH_URL,
  SOURCE,
  USER_AGENT,
} = require("@/constants/bmaConstants");
const { wait } = require("@/utils/torUtils");

async function fetchPage({ budgetYear, announceTypeId, pageNo, pageSize }) {
  const url = new URL(API_URL);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("sortBy", "publishDateDesc");
  url.searchParams.set("masterBudgetYearId", budgetYear);
  url.searchParams.set("masterAnnounceTypeId", announceTypeId);

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      const response = await fetch(url, {
        method: METHOD,
        headers: {
          Accept: "application/json, text/plain, */*",
          Referer: `${SEARCH_URL}?budgetYear=${budgetYear}&sortBy=publishDateDesc&announcementType=${announceTypeId}`,
          "User-Agent": USER_AGENT,
        },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      if (attempt === RETRY_COUNT) throw error;
      await wait(attempt * 1000);
    }
  }
  return { data: [], pageCount: 1 };
}

async function fetchBmaProjects({
  budgetYears = BUDGET_YEARS,
  announceTypes = ANNOUNCE_TYPES,
  pageSize = PAGE_SIZE,
} = {}) {
  const byId = new Map();

  for (const budgetYear of budgetYears) {
    for (const announceType of announceTypes) {
      let pageNo = 1;
      let pageCount = 1;
      while (pageNo <= pageCount) {
        try {
          const result = await fetchPage({
            budgetYear,
            announceTypeId: announceType.id,
            pageNo,
            pageSize,
          });
          for (const row of result.data || []) {
            const id = row.projectId || row.projectNumber;
            if (!id || byId.has(id)) continue;
            byId.set(id, { ...row, _budgetYear: budgetYear, _announceType: announceType.code });
          }
          pageCount = Math.max(Number.parseInt(result.pageCount || 1, 10), 1);
        } catch (error) {
          console.error(
            `Failed to fetch BMA e-GP2 ${budgetYear} ${announceType.code} page ${pageNo}: ${error.message}`,
          );
        }
        pageNo++;
      }
    }
  }

  return {
    rows: [...byId.values()],
    metadata: { budgetYears, announceTypes: announceTypes.map((type) => type.code) },
  };
}

module.exports = { fetch: fetchBmaProjects, fetchBmaProjects, method: METHOD, source: SOURCE };
