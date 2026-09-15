const {
  API_URL,
  BUDGET_YEAR,
  METHOD,
  PAGE_SIZE,
  PLAN_URL,
  RETRY_COUNT,
  SOURCE,
  USER_AGENT,
} = require("@/constants/bmaConstants");
const { wait } = require("@/utils/torUtils");

// BMA e-GP2 exposes its pagination total in each response rather than headers.
async function fetchBmaProjects({ budgetYear = BUDGET_YEAR, pageSize = PAGE_SIZE } = {}) {
  const rows = [];
  let pageNo = 1;
  let pageCount = 1;

  while (pageNo <= pageCount) {
    const url = new URL(API_URL);
    url.searchParams.set("pageNo", String(pageNo));
    url.searchParams.set("pageSize", String(pageSize));
    url.searchParams.set("sortBy", "announcedatedesc");
    url.searchParams.set("masterBudgetYearId", budgetYear);

    for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
      try {
        const response = await fetch(url, {
          method: METHOD,
          headers: {
            Accept: "application/json, text/plain, */*",
            Referer: `${PLAN_URL}?budgetYear=${budgetYear}`,
            "User-Agent": USER_AGENT,
          },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        rows.push(...(result.data || []));
        pageCount = Math.max(Number.parseInt(result.pageCount || 1, 10), 1);
        break;
      } catch (error) {
        if (attempt === RETRY_COUNT) console.error(`Failed to fetch BMA e-GP2 page ${pageNo}: ${error.message}`);
        else await wait(attempt * 1000);
      }
    }
    pageNo++;
  }

  // Metadata is preserved by the job for its sync summary, not sent to the adapter.
  return { rows, metadata: { budgetYear } };
}

module.exports = { fetch: fetchBmaProjects, fetchBmaProjects, method: METHOD, source: SOURCE };
