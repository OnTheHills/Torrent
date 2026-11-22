const assert = require("node:assert/strict");
const { test } = require("node:test");
const dns = require("node:dns/promises");
const { validateTorUrl, fetchTorUrl } = require("@/utils/torFetch");

const egp = "https://process5.gprocurement.go.th";
const bma = "https://egp2.bangkok.go.th";
const uuid = "ba56605e-7f5a-4717-8944-e9a23c11b606";
const fileId = "a".repeat(32);
const download = `${egp}/egp-upload-service/v1/downloadFileTest`;
const template = `${egp}/egp-template-service/dwnt/view-pdf-file`;
const service = `${egp}/egp-oann10-service/pb/a-egp-allt-project/announcement`;

test("document path allowlist accepts actual e-GP and BMA endpoint formats", () => {
  for (const url of [
    `${download}?fileId=${fileId}`,
    `${template}?templateId=${uuid}`,
    `${bma}/api/file/${uuid}/TOR.pdf`,
    `${bma}/api/file/${uuid}/${encodeURIComponent("ร่าง TOR (2569).pdf")}`,
    "https://adminapiegp.bangkok.go.th/Uploads/2026/TOR.pdf",
  ]) assert.equal(validateTorUrl(url).href, new URL(url).href);
});

test("SME status lookups permit only two API endpoints in their separate scope", () => {
  for (const endpoint of ["getProjectDetail", "getProcurementDetail"]) {
    const url = `${service}/${endpoint}?projectId=69109200267`;
    assert.equal(validateTorUrl(url, "egp-api").href, url);
    assert.throws(() => validateTorUrl(url, "egp"), { statusCode: 400 });
    assert.throws(() => validateTorUrl(url), { statusCode: 400 });
  }
  assert.throws(() => validateTorUrl(`${download}?fileId=${fileId}`, "egp-api"), { statusCode: 400 });
});

for (const url of [
  `${egp}/admin`, `${egp}/arbitrary.pdf`, `${egp}/egp-agpc01-web/announcement`,
  `${download}/extra?fileId=${fileId}`, `${download}?fileId=${fileId}&url=http://localhost`,
  `${download}?fileId=${fileId}&fileId=${fileId}`, `${download}`, `${download}?fileId=../secret`,
  `${download}?fileId=${fileId}%0d%0aHost:localhost`,
  `${template}?templateId=${fileId}`, `${template}?templateId=${uuid}&redirect=http://localhost`,
  `${egp}/egp-upload-service/v1/../v1/downloadFileTest?fileId=${fileId}`,
  `${egp}/egp-upload-service/v1/%2e%2e/v1/downloadFileTest?fileId=${fileId}`,
  `${egp}/egp-upload-service%2fv1/downloadFileTest?fileId=${fileId}`,
  `${bma}/api/file/not-an-id/TOR.pdf`, `${bma}/api/file/${uuid}/image.svg`,
  `${bma}/api/file/${uuid}/TOR.pdf?redirect=http://localhost`,
  `${bma}/api/file/${uuid}/%2e%2e/TOR.pdf`,
  `${bma}/api/file/${uuid}/%252e%252e.pdf`,
  `${bma}/api/file/${uuid}/folder%2ftor.pdf`,
  `${bma}/api/file/${uuid}/folder%5ctor.pdf`,
  `${bma}/api/file/${uuid}/bad%00.pdf`, `${bma}/api/file/${uuid}/bad%0a.pdf`,
  `${bma}/api/file/${uuid}/bad%.pdf`,
  "https://adminapiegp.bangkok.go.th/Admin/TOR.pdf",
  "https://adminapiegp.bangkok.go.th/Uploads/../Admin/TOR.pdf",
  "https://adminapiegp.bangkok.go.th/Uploads/%2e%2e/Admin/TOR.pdf",
  "https://adminapiegp.bangkok.go.th/Uploads/folder%252fTOR.pdf",
  "https://adminapiegp.bangkok.go.th/Uploads/TOR.html",
  "https://process3.gprocurement.go.th/arbitrary.pdf",
]) {
  test(`disallowed document path is rejected before DNS: ${url}`, async (t) => {
    t.mock.method(dns, "lookup", () => assert.fail("Disallowed path reached DNS"));
    t.mock.method(globalThis, "fetch", () => assert.fail("Disallowed path reached HTTP"));
    await assert.rejects(fetchTorUrl(url), { statusCode: 400 });
  });
}

test("API scope rejects unrelated endpoints and injected project parameters", () => {
  for (const suffix of [
    "getProjectDetail?projectId=69109200267&url=http://localhost",
    "getProjectDetail?projectId=69109200267&projectId=69109200267",
    "getProjectDetail?projectId=../secret", "getProjectDetail?projectId=69109200267%0a",
    "deleteProject?projectId=69109200267",
  ]) assert.throws(() => validateTorUrl(`${service}/${suffix}`, "egp-api"), { statusCode: 400 });
});
