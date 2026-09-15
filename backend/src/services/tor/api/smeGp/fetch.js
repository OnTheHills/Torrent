const {
  API_URL,
  METHOD,
  PAGE_SIZE,
  RETRY_COUNT,
  SEARCH_TERMS,
  SOURCE,
} = require("@/constants/smeGpConstants");
const { wait } = require("@/utils/torUtils");

// Keep retries at the HTTP boundary; adapters only receive successful raw JSON rows.
async function fetchPage(payload, retries = RETRY_COUNT) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: METHOD,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      if (attempt === retries) throw error;
      await wait(attempt * 1000);
    }
  }
}

async function fetchSmeGpSearch(search, pageSize = PAGE_SIZE) {
  const payload = {
    start: "0",
    length: String(pageSize),
    draw: "10",
    orders: [{ column: "published", dir: "DESC" }],
    search,
  };
  // SME-GP reports the result count only with the first DataTables response.
  const firstPage = await fetchPage(payload);
  const rows = firstPage.data || [];
  const total = Number.parseInt(firstPage.recordsFiltered || firstPage.recordsTotal || 0, 10);

  for (let start = pageSize; start < total; start += pageSize) {
    try {
      const page = await fetchPage({ ...payload, start: String(start) });
      rows.push(...(page.data || []));
    } catch (error) {
      console.error(`Failed to fetch SME-GP page ${start} for "${search}": ${error.message}`);
    }
  }

  return rows;
}

async function fetchSmeGp() {
  // Search terms overlap by design. The adapter deduplicates their raw results.
  const results = await Promise.all(
    SEARCH_TERMS.map(async (search) => {
      try {
        return await fetchSmeGpSearch(search);
      } catch (error) {
        console.error(`Failed to fetch SME-GP search "${search}": ${error.message}`);
        return [];
      }
    }),
  );
  return { rows: results.flat() };
}

module.exports = { fetch: fetchSmeGp, fetchSmeGpSearch, method: METHOD, source: SOURCE };
