const torService = require("../services/torService");
const {
  API_URL,
  PAGE_SIZE,
  API_SEARCHES,
  INCLUDE_KEYWORDS,
  EXCLUDE_KEYWORDS,
} = require("../constants/smeGpConstants");

function compactText(value) {
  return (value || "").toString().replace(/\s+/g, "").toLowerCase();
}

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

async function fetchSearch(searchStr, pageSize = PAGE_SIZE, retries = 3) {
  const basePayload = {
    start: "0",
    length: pageSize.toString(),
    draw: "10",
    orders: [{ column: "published", dir: "DESC" }],
    search: searchStr,
  };

  let firstResponse;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      firstResponse = await res.json();
      break;
    } catch (error) {
      if (attempt === retries) {
        console.error(`Failed to fetch for search "${searchStr}": ${error.message}`);
        return [];
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  const total = parseInt(firstResponse.recordsFiltered || firstResponse.recordsTotal || 0, 10);
  let rows = firstResponse.data || [];

  for (let start = pageSize; start < total; start += pageSize) {
    const payload = { ...basePayload, start: start.toString() };
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const result = await res.json();
        rows = rows.concat(result.data || []);
        break;
      } catch (error) {
        if (attempt === retries) {
          console.error(`Failed to fetch page ${start} for "${searchStr}": ${error.message}`);
        } else {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }
  }

  return rows;
}

async function syncSmeGpData() {
  console.log("Starting SME-GP data sync...");
  const allRows = [];

  // Fetch data concurrently for each search term
  const fetchPromises = API_SEARCHES.map((search) => fetchSearch(search));
  const results = await Promise.all(fetchPromises);

  results.forEach((rows) => {
    allRows.push(...rows);
  });

  // Filter out duplicates based on _id
  const uniqueCandidates = new Map();
  allRows.forEach((row) => {
    const id = row._id || row.link || JSON.stringify(row);
    if (!uniqueCandidates.has(id)) {
      uniqueCandidates.set(id, row);
    }
  });

  const candidates = Array.from(uniqueCandidates.values());
  console.log(`Fetched ${candidates.length} unique candidates from API.`);

  let savedCount = 0;

  for (const candidate of candidates) {
    const keyword = matchingKeyword(candidate.title);
    if (!keyword) continue;

    // Determine category based on matched keyword or generic
    let category = "Software Development";
    if (keyword.includes("เว็บไซต์") || keyword.includes("เว็บ")) category = "Web Application";
    else if (keyword.includes("แอปพลิเคชัน") || keyword.includes("แอพ")) category = "Mobile Application";
    else if (keyword.includes("ฐานข้อมูล")) category = "Data Platform";

    const torData = {
      refId: candidate._id || candidate.project_id || `SMEGP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: candidate.title,
      titleTh: candidate.title, // Assume title is in Thai
      department: candidate.deptName,
      departmentTh: candidate.deptName,
      agencyId: candidate.deptsubName || "sme-gp", // Default fallback if no specific agency code
      publishedAt: candidate.published ? new Date(candidate.published) : new Date(),
      source: "SME-GP",
      egpUrl: candidate.link || "https://thaismegp.com/",
      category: category,
      budgetThb: candidate.budget ? parseFloat(candidate.budget) : 0, // Assuming API returns budget string
      status: "published", // Default since it's on the SME-GP site
      summary: `Matched keyword: ${keyword}`,
      summaryTh: `พบคำค้นหา: ${keyword}`,
    };

    try {
      await torService.upsertTorByRefId(torData.refId, torData);
      savedCount++;
    } catch (err) {
      console.error(`Error saving TOR ${torData.refId}:`, err.message);
    }
  }

  console.log(`SME-GP sync complete. Saved/Updated ${savedCount} TORs matching software criteria.`);
  return { fetched: candidates.length, saved: savedCount };
}

module.exports = {
  syncSmeGpData,
};
