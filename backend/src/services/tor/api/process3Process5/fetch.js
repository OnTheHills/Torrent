const { decodeRss, parseRssItems } = require("@/services/tor/api/egpRss/parse");
const { matchingKeyword } = require("@/services/tor/api/egpRss/adapter");
const torRepository = require("@/repositories/tor/torRepository");
const { readBoundedBytes } = require("@/utils/boundedText");
const { parseXml, elementsNamed, xmlText } = require("@/utils/xmlText");
const { decodeXmlBytes } = require("@/utils/xmlDecode");

const RSS_URL = "https://process3.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml";
const DETAIL_URL = "https://process5.gprocurement.go.th/egp-oann10-service/pb/a-egp-allt-project/announcement";
const SOURCE = "EGP-PROCESS5";
const TYPES = ["B0", "D0"];

function compareDeptIds(a, b) {
  return a.localeCompare(b, "en", { numeric: true }) || a.localeCompare(b);
}

async function feed(deptId, type) {
  const url = new URL(RSS_URL);
  url.searchParams.set("anounceType", type);
  if (deptId) url.searchParams.set("deptId", deptId);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`process3 RSS HTTP ${response.status}`);
  return parseRssItems(decodeRss(await readBoundedBytes(response), response.headers?.get("content-type") || ""), {
    announceType: type,
    deptId,
  }).flatMap((item) => {
    const projectId = item.description.match(/^\s*(\d{11})\b/)?.[1];
    return projectId && item.link ? [{ ...item, projectId }] : [];
  });
}

async function projectDetail(projectId) {
  const xmlFields = (node) => Object.fromEntries((node?.children || [])
    .filter((child) => typeof child !== "string")
    .map((child) => [child.originalName, xmlText(child).trim()]));
  const get = async (name) => {
    const url = new URL(`${DETAIL_URL}/${name}`);
    url.searchParams.set("projectId", projectId);
    const response = await fetch(url, {
      headers: { Accept: "application/json, application/xml;q=0.9" },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`process5 ${name} HTTP ${response.status}`);
    const contentType = response.headers?.get("content-type") || "";
    const bytes = await readBoundedBytes(response);
    let result;
    if (contentType.toLowerCase().includes("xml")) {
      const xml = parseXml(decodeXmlBytes(bytes, { contentType }));
      result = {
        response: xmlFields(elementsNamed(xml, "response").next().value),
        data: xmlFields(elementsNamed(xml, "data").next().value),
      };
    } else {
      result = JSON.parse(bytes.toString("utf8"));
    }
    if (result.validateCfTurnTile === false) throw new Error(`process5 ${name} requires Cloudflare validation`);
    if (Number(result.response?.responseCode) !== 0 || !result.data || result.data.projectId !== projectId) {
      throw new Error(`process5 ${name} returned no matching project`);
    }
    return result.data;
  };
  const project = await get("getProjectDetail");
  const procurement = await get("getProcurementDetail");
  return { project, procurement };
}

async function fetchProjects() {
  const feeds = [];
  const byId = new Map();
  const configuredDepartmentIds = new Set(
    (process.env.EGP_DEPT_IDS || "").split(",").map((id) => id.trim()).filter(Boolean),
  );
  const departmentIds = new Set([
    ...configuredDepartmentIds,
    ...(await torRepository.findEgpDeptIds(SOURCE)),
  ]);
  const errors = [];
  const departmentOrder = [];
  const fetchedDepartments = new Set();
  const attemptedProjects = new Set();
  const detailsByProject = new Map();

  async function collect(deptId) {
    for (const type of TYPES) {
      try {
        const items = await feed(deptId, type);
        feeds.push({ deptId: deptId || null, type, items: items.length });
        for (const item of items) {
          const previous = byId.get(item.projectId);
          if (!previous || type === "D0") byId.set(item.projectId, item);
        }
      } catch (error) {
        errors.push(`${deptId || "all"}/${type}: ${error.message}`);
      }
    }
  }

  if (!configuredDepartmentIds.size) await collect("");
  let resolved = 0;
  async function resolvePendingProjects() {
    const pending = [...byId.values()]
      .filter((item) => matchingKeyword(item.title))
      .map((item) => item.projectId)
      .filter((projectId) => !attemptedProjects.has(projectId))
      .sort(compareDeptIds);
    for (const projectId of pending) {
      attemptedProjects.add(projectId);
      // RSS has project IDs but no department ID in each item; process5 supplies it.
      try {
        const detail = await projectDetail(projectId);
        detailsByProject.set(projectId, detail);
        resolved++;
        if (detail.procurement.deptId) departmentIds.add(detail.procurement.deptId);
      } catch (error) {
        errors.push(`${projectId}: ${error.message}`);
      }
    }
  }

  await resolvePendingProjects();
  while (true) {
    const nextDepartment = [...departmentIds]
      .filter((deptId) => !fetchedDepartments.has(deptId))
      .sort(compareDeptIds)[0];
    if (!nextDepartment) break;
    fetchedDepartments.add(nextDepartment);
    departmentOrder.push(nextDepartment);
    await collect(nextDepartment);
    await resolvePendingProjects();
  }

  if (!feeds.length) throw new Error(`process3 RSS unavailable: ${errors.join(" | ")}`);
  if (attemptedProjects.size && !resolved) throw new Error(`process5 project lookup unavailable: ${errors.join(" | ")}`);
  const rows = [...byId.values()].flatMap((item) => {
    const detail = detailsByProject.get(item.projectId);
    if (!detail || !matchingKeyword(detail.project.projectName || item.title)) return [];
    return [{ ...item, ...detail }];
  });
  return {
    rows,
    metadata: {
      feeds,
      departments: departmentIds.size,
      departmentOrder,
      discovered: byId.size,
      errors,
    },
  };
}

module.exports = { fetch: fetchProjects, feed, projectDetail, compareDeptIds, method: "GET", source: SOURCE };
