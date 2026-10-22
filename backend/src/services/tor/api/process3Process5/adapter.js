const { matchingKeyword } = require("@/services/tor/api/egpRss/adapter");
const { classifyCategory, parseBudget, parseDate } = require("@/utils/torUtils");

function adapt(rows) {
  return rows.flatMap(({ projectId, title, link, publishedAt, announceType, project, procurement }) => {
    const name = String(project.projectName || title || "").trim();
    const keyword = matchingKeyword(name);
    if (!keyword || !projectId) return [];
    const department = String(procurement.deptSubName || project.deptSubName || project.deptName || "e-GP").trim();
    const listing = new URL("https://process5.gprocurement.go.th/egp-agpc01-web/announcement");
    listing.searchParams.set("keywordSearch", projectId);
    return [{
      refId: projectId,
      title: name,
      titleTh: name,
      department,
      departmentTh: department,
      agencyId: "egp",
      egpDeptId: procurement.deptId || undefined,
      egpDeptSubId: procurement.deptSubId || undefined,
      source: "EGP-PROCESS5",
      egpUrl: listing.toString(),
      documentUrl: link,
      category: classifyCategory(name),
      budgetThb: parseBudget(procurement.projectMoney) || undefined,
      priceBuildThb: parseBudget(procurement.priceBuild) || undefined,
      budgetYear: project.budgetYear || undefined,
      publishedAt: parseDate(publishedAt),
      status: announceType === "B0" ? "draft" : "published",
      summary: `e-GP RSS matched terms: ${keyword}`,
    }];
  });
}

module.exports = { adapt };
