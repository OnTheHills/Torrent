const { classifyCategory, parseBudget } = require("@/utils/torUtils");
const { parseEgpDate } = require("@/services/tor/api/dataGo/adapter");

function adapt(rows = []) {
  return rows.flatMap(({ dataGo, project, procurement, documentUrl }) => {
    const projectId = String(dataGo.project_id || "");
    if (!projectId || String(project.projectId) !== projectId || String(procurement.projectId) !== projectId) return [];
    const title = project.projectName || dataGo.project_name;
    const listing = new URL("https://process5.gprocurement.go.th/egp-agpc01-web/announcement");
    listing.searchParams.set("keywordSearch", projectId);
    return [{
      refId: projectId,
      source: "EGP-PROCESS5",
      title,
      titleTh: title,
      department: procurement.deptSubName || dataGo.dept_sub_name || dataGo.dept_name || "e-GP",
      departmentTh: dataGo.dept_name || procurement.deptSubName || "e-GP",
      agencyId: "egp",
      egpUrl: listing.toString(),
      publishedAt: parseEgpDate(dataGo.announce_date || dataGo.transaction_date),
      category: classifyCategory(title),
      status: documentUrl ? "published" : "discovered",
      documentUrl,
      egpDeptId: procurement.deptId || undefined,
      egpDeptSubId: procurement.deptSubId || undefined,
      budgetThb: parseBudget(procurement.projectMoney) || parseBudget(dataGo.project_money) || undefined,
      priceBuildThb: parseBudget(procurement.priceBuild) || undefined,
      budgetYear: String(project.budgetYear || dataGo.year || "") || undefined,
      summary: documentUrl
        ? "Discovered by data.go; project details and document verified by process5."
        : "Discovered by data.go; project details verified by process5. TOR document pending.",
    }];
  });
}

module.exports = { adapt };
