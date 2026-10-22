const assert = require("node:assert/strict");
const { test } = require("node:test");
const { zipSync } = require("fflate");
const torRepository = require("@/repositories/torRepository");
const source = require("@/services/tor/api/process3Process5/fetch");
const { adapt } = require("@/services/tor/api/process3Process5/adapter");
const { downloadTor } = require("@/services/tor/ocr/ocrEgp");

test("process5 project lookup accepts its XML response", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    const id = new URL(url).searchParams.get("projectId");
    const field = new URL(url).pathname.endsWith("getProjectDetail")
      ? "<projectName>พัฒนาระบบ &amp; เว็บไซต์</projectName>"
      : "<deptId>0703</deptId><projectMoney>2000000.00</projectMoney>";
    return {
      ok: true,
      headers: { get: () => "application/xml" },
      text: async () => `<ApiSuccessView><response><responseCode>0</responseCode></response><data><projectId>${id}</projectId>${field}</data></ApiSuccessView>`,
    };
  });
  const detail = await source.projectDetail("69109054191");
  assert.equal(detail.project.projectName, "พัฒนาระบบ & เว็บไซต์");
  assert.equal(detail.procurement.projectMoney, "2000000.00");
});

test("process3 project ID resolves process5 department and exact budget", async (t) => {
  const previous = process.env.EGP_DEPT_IDS;
  process.env.EGP_DEPT_IDS = "";
  t.after(() => { if (previous === undefined) delete process.env.EGP_DEPT_IDS; else process.env.EGP_DEPT_IDS = previous; });
  t.mock.method(torRepository, "findEgpDeptIds", async () => []);
  const feeds = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    const target = new URL(url);
    if (target.hostname === "process3.gprocurement.go.th") {
      feeds.push(`${target.searchParams.get("deptId") || "all"}/${target.searchParams.get("anounceType")}`);
      const xml = target.searchParams.get("deptId") || target.searchParams.get("anounceType") !== "B0"
        ? "<rss><channel></channel></rss>"
        : `<rss><channel><item><title>จ้างพัฒนาระบบสารสนเทศ</title><link>https://process5.gprocurement.go.th/file.zip</link><description>69109200267, ร่างประกาศ</description><pubDate>2026-10-15</pubDate></item></channel></rss>`;
      return { ok: true, arrayBuffer: async () => Buffer.from(xml) };
    }
    const projectId = target.searchParams.get("projectId");
    assert.equal(projectId, "69109200267");
    const data = target.pathname.endsWith("getProjectDetail")
      ? { projectId, projectName: "จ้างพัฒนาระบบสารสนเทศ", budgetYear: "2570" }
      : { projectId, deptId: "001419900", deptSubId: "00141990016000000", deptSubName: "โรงพยาบาลมะเร็งลพบุรี", projectMoney: 4000000, priceBuild: 3900000 };
    return { ok: true, json: async () => ({ data, response: { responseCode: 0 } }) };
  });
  const result = await source.fetch();
  const tors = adapt(result.rows);
  assert.ok(feeds.includes("001419900/B0"));
  assert.equal(tors.length, 1);
  assert.equal(tors[0].refId, "69109200267");
  assert.equal(tors[0].egpDeptId, "001419900");
  assert.equal(tors[0].budgetThb, 4000000);
  assert.equal(tors[0].priceBuildThb, 3900000);
  assert.equal(tors[0].documentUrl, "https://process5.gprocurement.go.th/file.zip");
});

test("configured departments skip the global feed and resolve only tech titles", async (t) => {
  const previous = process.env.EGP_DEPT_IDS;
  process.env.EGP_DEPT_IDS = "0703";
  t.after(() => { if (previous === undefined) delete process.env.EGP_DEPT_IDS; else process.env.EGP_DEPT_IDS = previous; });
  t.mock.method(torRepository, "findEgpDeptIds", async () => []);
  const feeds = [];
  const projects = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    const target = new URL(url);
    if (target.hostname === "process3.gprocurement.go.th") {
      feeds.push(`${target.searchParams.get("deptId") || "all"}/${target.searchParams.get("anounceType")}`);
      const item = target.searchParams.get("anounceType") === "B0"
        ? '<item><title>จ้างพัฒนาระบบสารสนเทศ</title><link>https://process5.gprocurement.go.th/tor.zip</link><description>69109200267, ร่างประกาศ</description></item><item><title>จ้างทำความสะอาดอาคาร</title><link>https://process5.gprocurement.go.th/other.zip</link><description>69109200268, ร่างประกาศ</description></item>'
        : "";
      return { ok: true, arrayBuffer: async () => Buffer.from(`<rss><channel>${item}</channel></rss>`) };
    }
    const projectId = new URL(url).searchParams.get("projectId");
    projects.push(projectId);
    const data = new URL(url).pathname.endsWith("getProjectDetail")
      ? { projectId, projectName: "จ้างพัฒนาระบบสารสนเทศ" }
      : { projectId, deptId: "0703", deptSubId: "0700300006", deptSubName: "กรมชลประทาน", projectMoney: 2000000 };
    return { ok: true, json: async () => ({ data, response: { responseCode: 0 } }) };
  });

  const result = await source.fetch();
  assert.deepEqual(feeds, ["0703/B0", "0703/D0"]);
  assert.deepEqual(projects, ["69109200267", "69109200267"]);
  assert.equal(result.rows.length, 1);
});

test("process5 ZIP prefers the text-layer TOR over a large scanned attachment", async (t) => {
  const zip = zipSync({
    "Attach_TOR_1.pdf": new TextEncoder().encode("%PDF-scan"),
    "tor_69109200267.pdf": new TextEncoder().encode("%PDF-text"),
    "annoudoc.pdf": new TextEncoder().encode("%PDF-notice"),
  });
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, arrayBuffer: async () => zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) }));
  const result = await downloadTor("https://process5.gprocurement.go.th/file.zip");
  assert.equal(result.fileName, "tor_69109200267.pdf");
  assert.equal(result.pdf.toString(), "%PDF-text");
  assert.equal(result.noticePdf.toString(), "%PDF-notice");
});
