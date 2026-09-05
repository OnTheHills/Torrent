const {
  API_URL,
  WEBSITE_URL,
  RETRY_COUNT,
  SOURCE,
  METHOD,
  PAGE_SIZE,
  SEARCH_TERMS,
  INCLUDE_KEYWORDS,
  EXCLUDE_KEYWORDS,
} = require("../constants/smeGpConstants");
const {
  classifyCategory,
  parseBudget,
  wait,
} = require("../utils/torUtils");

// This adapter owns the SME-GP POST payload and its DataTables-style paging format.

function compactText(value) {
  return (value || "").toString().replace(/\s+/g, "").toLowerCase();
}

// Reject false positives before accepting the first supported software-development term.
function matchingKeyword(title) {
  const normalizedTitle = compactText(title);
  if (!normalizedTitle) return null;

  for (const term of EXCLUDE_KEYWORDS) {
    if (normalizedTitle.includes(compactText(term))) return null;
  }

  for (const keyword of INCLUDE_KEYWORDS) {
    if (normalizedTitle.includes(compactText(keyword))) return keyword;
  }
  return null;
}

async function fetchSmeGpSearch(searchStr, pageSize = PAGE_SIZE, retries = RETRY_COUNT) {
  const basePayload = {
    start: "0",
    length: pageSize.toString(),
    draw: "10",
    orders: [{ column: "published", dir: "DESC" }],
    search: searchStr,
  };

  // The first request provides the total; later requests fetch the remaining offsets.
  let firstResponse;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: METHOD,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      firstResponse = await res.json();
      break;
    } catch (error) {
      if (attempt === retries) {
        console.error(`Failed to fetch SME-GP search "${searchStr}": ${error.message}`);
        return [];
      }
      await wait(attempt * 1000);
    }
  }

  const total = parseInt(
    firstResponse.recordsFiltered || firstResponse.recordsTotal || 0,
    10,
  );
  let rows = firstResponse.data || [];

  for (let start = pageSize; start < total; start += pageSize) {
    const payload = { ...basePayload, start: start.toString() };
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(API_URL, {
          method: METHOD,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const result = await res.json();
        rows = rows.concat(result.data || []);
        break;
      } catch (error) {
        if (attempt === retries) {
          console.error(
            `Failed to fetch SME-GP page ${start} for "${searchStr}": ${error.message}`,
          );
        } else {
          await wait(attempt * 1000);
        }
      }
    }
  }

  return rows;
}

function mapSmeGpCandidate(candidate, keyword) {
  return {
    refId:
      candidate._id ||
      candidate.project_id ||
      `SMEGP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: candidate.title,
    titleTh: candidate.title,
    department: candidate.deptName,
    departmentTh: candidate.deptName,
    agencyId: candidate.deptsubName || "sme-gp",
    publishedAt: candidate.published ? new Date(candidate.published) : new Date(),
    source: SOURCE,
    egpUrl: candidate.link || WEBSITE_URL,
    category: classifyCategory(keyword),
    budgetThb: parseBudget(candidate.budget),
    status: "published",
    summary: `Matched keyword: ${keyword}`,
    summaryTh: `พบคำค้นหา: ${keyword}`,
  };
}

async function fetchSmeGpTors() {
  const allRows = [];
  const results = await Promise.all(SEARCH_TERMS.map((search) => fetchSmeGpSearch(search)));

  results.forEach((rows) => {
    allRows.push(...rows);
  });

  // Several broad searches can return the same project. Deduplicate before mapping/upserting.
  const uniqueCandidates = new Map();
  allRows.forEach((row) => {
    const id = row._id || row.link || JSON.stringify(row);
    if (!uniqueCandidates.has(id)) {
      uniqueCandidates.set(id, row);
    }
  });

  const rows = Array.from(uniqueCandidates.values());
  const tors = rows
    .map((candidate) => {
      const keyword = matchingKeyword(candidate.title);
      return keyword ? mapSmeGpCandidate(candidate, keyword) : null;
    })
    .filter(Boolean);

  return {
    fetched: rows.length,
    method: METHOD,
    source: SOURCE,
    tors,
  };
}

module.exports = {
  fetchSmeGpSearch,
  fetchSmeGpTors,
  matchingKeyword,
  method: METHOD,
  source: SOURCE,
};
