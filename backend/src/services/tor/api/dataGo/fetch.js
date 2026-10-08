const {
  API_URL,
  METHOD,
  PAGE_SIZE,
  RETRY_COUNT,
  SEARCH_TERMS,
  SOURCE,
  YEARS,
} = require("@/constants/dataGoConstants");
const { wait } = require("@/utils/torUtils");

async function fetchPage({ apiKey, year, keyword, offset }) {
  const url = new URL(API_URL);
  url.search = new URLSearchParams({
    "api-key": apiKey,
    year,
    keyword,
    offset: String(offset),
    limit: String(PAGE_SIZE),
  }).toString();

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      const response = await fetch(url, {
        method: METHOD,
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw new Error(`data.go API HTTP ${response.status}`);
      const result = await response.json();
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error(result.message || "Unexpected data.go API response");
      }
      return result;
    } catch (error) {
      if (attempt === RETRY_COUNT) throw error;
      await wait(attempt * 1000);
    }
  }
}

async function fetchKeyword({ apiKey, year, keyword }) {
  const rows = [];
  let offset = 0;
  let total = 0;
  do {
    const page = await fetchPage({ apiKey, year, keyword, offset });
    total = Number(page.total) || 0;
    rows.push(...page.data);
    if (!page.data.length) break;
    offset += page.data.length;
  } while (offset < total);
  return { year, keyword, total, rows };
}

async function mapPool(items, limit, worker) {
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index++;
      await worker(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}

async function fetchDataGo() {
  const apiKey = process.env.DATA_GO_API_KEY;
  if (!apiKey) throw new Error("DATA_GO_API_KEY is required for the data.go e-GP API");

  const projects = new Map();
  const errors = [];
  const completedQueries = [];
  const queries = YEARS.flatMap((year) => SEARCH_TERMS.map((keyword) => ({ year, keyword })));

  await mapPool(queries, 4, async (query) => {
    try {
      const result = await fetchKeyword({ apiKey, ...query });
      completedQueries.push({ year: result.year, keyword: result.keyword, total: result.total });
      for (const row of result.rows) {
        if (row.project_id) projects.set(String(row.project_id), row);
      }
    } catch (error) {
      errors.push({ ...query, message: error.message });
    }
  });

  return {
    rows: [...projects.values()],
    metadata: {
      years: YEARS,
      searchTerms: SEARCH_TERMS,
      completedQueries,
      errors,
      projectCount: projects.size,
    },
  };
}

module.exports = {
  fetch: fetchDataGo,
  fetchDataGo,
  method: METHOD,
  source: SOURCE,
};
