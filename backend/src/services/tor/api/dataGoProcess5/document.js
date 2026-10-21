const APPROVAL_URL = "https://process5.gprocurement.go.th/egp-approval-service/apv-common";
const DOWNLOAD_URL = "https://process5.gprocurement.go.th/egp-upload-service/v1/downloadFileTest";

async function documentForProject(projectId) {
  for (const endpoint of ["infoProcureDocAnnounZip", "infoProcureDocAnnounZipTemp"]) {
    const url = new URL(`${APPROVAL_URL}/${endpoint}`);
    url.searchParams.set("projectId", projectId);
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`process5 ${endpoint} HTTP ${response.status}`);
    const result = await response.json();
    if (result.validateCfTurnTile === false) throw new Error(`process5 ${endpoint} requires Cloudflare validation`);
    if (Number(result.response?.responseCode) !== 0) {
      if (result.response?.messageCode === "E0001" && !result.data) continue;
      throw new Error(`process5 ${endpoint}: ${result.response?.description || "invalid response"}`);
    }
    if (result.data?.projectId && String(result.data.projectId) !== projectId) {
      throw new Error(`process5 ${endpoint} returned another project`);
    }
    const fileId = result.data?.zipId;
    if (!fileId) continue;
    if (!/^[a-f\d]{32}$/i.test(fileId)) throw new Error(`process5 ${endpoint} returned invalid file ID`);
    const download = new URL(DOWNLOAD_URL);
    download.searchParams.set("fileId", fileId);
    return { documentUrl: download.toString(), documentSource: endpoint };
  }
  return null;
}

module.exports = { documentForProject };
