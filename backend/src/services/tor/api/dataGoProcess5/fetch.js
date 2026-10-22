const dataGo = require("@/services/tor/api/dataGo/fetch");
const { matchingKeyword } = require("@/services/tor/api/egpRss/adapter");
const { projectDetail } = require("@/services/tor/api/process3Process5/fetch");
const torRepository = require("@/repositories/torRepository");
const { documentForProject } = require("./document");

async function fetchProjects() {
  const discovery = await dataGo.fetch();
  if (!discovery.metadata.completedQueries.length) {
    throw new Error(`data.go discovery failed: ${discovery.metadata.errors[0]?.message || "no completed queries"}`);
  }
  const candidates = discovery.rows.filter((row) => row.project_id && matchingKeyword(row.project_name));
  const saved = await torRepository.findBySource("EGP-PROCESS5");
  const existing = new Set(saved.map((tor) => tor.refId));
  const batchSize = Math.min(Math.max(Number(process.env.EGP_MAX_PROJECTS_PER_SYNC) || 20, 1), 200);
  const order = (a, b) => {
    const ebidding = (row) => /e-bidding/i.test(String(row.purchase_method_name || ""));
    return Number(ebidding(b)) - Number(ebidding(a)) || String(b.project_id).localeCompare(String(a.project_id));
  };
  const newCandidates = candidates
    .filter((row) => !existing.has(String(row.project_id)))
    .sort(order);
  const pendingIds = new Set(saved.filter((tor) => !tor.documentUrl).map((tor) => tor.refId));
  const pendingCandidates = candidates.filter((row) => pendingIds.has(String(row.project_id))).sort(order);
  const selected = [...newCandidates, ...pendingCandidates].slice(0, batchSize);
  const rows = [];
  const errors = [];
  const documentErrors = [];
  let rateLimited = false;
  for (const row of selected) {
    const projectId = String(row.project_id);
    try {
      const detail = await projectDetail(projectId);
      let document;
      try {
        document = await documentForProject(projectId);
      } catch (error) {
        documentErrors.push({ projectId, message: error.message });
        rateLimited = /HTTP 429|rate limit|Cloudflare validation/i.test(error.message);
      }
      rows.push({ dataGo: row, ...detail, ...document });
      if (rateLimited) break;
    } catch (error) {
      errors.push({ projectId, message: error.message });
      if (/HTTP 429|rate limit|Cloudflare validation/i.test(error.message)) {
        rateLimited = true;
        break;
      }
    }
  }
  if (selected.length && !rows.length && !rateLimited) {
    throw new Error(`process5 lookup failed for all ${selected.length} selected data.go projects: ${errors[0]?.message}`);
  }
  return {
    rows,
    metadata: {
      ...discovery.metadata,
      discovered: discovery.rows.length,
      candidates: candidates.length,
      selected: selected.length,
      previouslySaved: existing.size,
      process5Resolved: rows.length,
      documentLinks: rows.filter((row) => row.documentUrl).length,
      rateLimited,
      process5Errors: errors,
      documentErrors,
    },
  };
}

module.exports = { fetch: fetchProjects, method: "GET", source: "EGP-PROCESS5" };
