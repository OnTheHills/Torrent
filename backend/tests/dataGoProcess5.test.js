const assert = require("node:assert/strict");
const { test } = require("node:test");
const dataGo = require("@/services/tor/api/dataGo/fetch");
const pipeline = require("@/services/tor/api/dataGoProcess5/fetch");
const { adapt } = require("@/services/tor/api/dataGoProcess5/adapter");
const { documentForProject } = require("@/services/tor/api/dataGoProcess5/document");
const torRepository = require("@/repositories/torRepository");

test("data.go IDs are verified against process5 before mapping budgets", async (t) => {
  t.mock.method(dataGo, "fetch", async () => ({
    rows: [{ project_id: "69109054191", project_name: "จ้างพัฒนาระบบสารสนเทศ", project_money: 1000000, dept_name: "กรมชลประทาน", year: 2570 }],
    metadata: { completedQueries: [{ year: "2570", keyword: "พัฒนาระบบ" }], errors: [] },
  }));
  t.mock.method(torRepository, "findBySource", async () => []);
  t.mock.method(globalThis, "fetch", async (url) => {
    const projectId = new URL(url).searchParams.get("projectId");
    const data = new URL(url).pathname.endsWith("getProjectDetail")
      ? { projectId, projectName: "จ้างพัฒนาระบบสารสนเทศ", budgetYear: "2570" }
      : { projectId, deptId: "0703", projectMoney: 2000000, priceBuild: 1800000 };
    return { ok: true, json: async () => ({ data, response: { responseCode: 0 } }) };
  });
  const result = await pipeline.fetch();
  const mapped = adapt(result.rows);
  assert.equal(result.metadata.process5Resolved, 1);
  assert.equal(result.metadata.documentLinks, 0);
  assert.equal(mapped[0].budgetThb, 2000000);
  assert.equal(mapped[0].priceBuildThb, 1800000);
  assert.equal(mapped[0].documentUrl, undefined);
});

test("process5 document metadata supplies the official TOR ZIP download URL", async (t) => {
  const id = "69099651694";
  const zipId = "ae17bb3eaeff41d89054742c7bf84972";
  t.mock.method(globalThis, "fetch", async (url) => {
    const target = new URL(url);
    assert.equal(target.searchParams.get("projectId"), id);
    assert.ok(target.pathname.endsWith("infoProcureDocAnnounZip"));
    return {
      ok: true,
      json: async () => ({ response: { responseCode: "0" }, data: { projectId: id, zipId } }),
    };
  });
  const document = await documentForProject(id);
  assert.equal(document.documentUrl, `https://process5.gprocurement.go.th/egp-upload-service/v1/downloadFileTest?fileId=${zipId}`);
  const mapped = adapt([{
    dataGo: { project_id: id, project_name: "จ้างพัฒนาระบบสารสนเทศ", project_money: 1000000 },
    project: { projectId: id, projectName: "จ้างพัฒนาระบบสารสนเทศ" },
    procurement: { projectId: id, projectMoney: 2000000 },
    ...document,
  }]);
  assert.equal(mapped[0].documentUrl, document.documentUrl);
  assert.equal(mapped[0].status, "published");
});

test("process5 checks the draft ZIP when no published ZIP exists", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    const endpoint = new URL(url).pathname.split("/").at(-1);
    calls.push(endpoint);
    return {
      ok: true,
      json: async () => endpoint.endsWith("Temp")
        ? { response: { responseCode: "0" }, data: { projectId: "69099651694", zipId: "ae17bb3eaeff41d89054742c7bf84972" } }
        : { response: { responseCode: "1", messageCode: "E0001" }, data: null },
    };
  });
  const document = await documentForProject("69099651694");
  assert.deepEqual(calls, ["infoProcureDocAnnounZip", "infoProcureDocAnnounZipTemp"]);
  assert.equal(document.documentSource, "infoProcureDocAnnounZipTemp");
});

test("process5 rate limit leaves saved documents available for OCR", async (t) => {
  t.mock.method(dataGo, "fetch", async () => ({
    rows: [{ project_id: "69109054191", project_name: "จ้างพัฒนาระบบสารสนเทศ" }],
    metadata: { completedQueries: [{ year: "2570", keyword: "พัฒนาระบบ" }], errors: [] },
  }));
  t.mock.method(torRepository, "findBySource", async () => []);
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 429 }));
  const result = await pipeline.fetch();
  assert.deepEqual(result.rows, []);
  assert.equal(result.metadata.rateLimited, true);
  assert.equal(result.metadata.process5Errors[0].projectId, "69109054191");
});
