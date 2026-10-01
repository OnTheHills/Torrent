const assert = require("node:assert/strict");
const { test } = require("node:test");
const { announcementFileUrl, projectIdFromUrl } = require("@/services/tor/api/bmaEgp2/files");
const { alreadyExtracted } = require("@/services/tor/ocr/ocrBmaPlans");
const {
  hasUsableTextLayer,
  normalizeExtract,
  parseModelJson,
  structurePlainText,
} = require("@/services/tor/ocr/extractPlanPdf");

test("project TOR file URL encodes the public BMA file path", () => {
  assert.equal(
    projectIdFromUrl("https://egp2.bangkok.go.th/project-detail/40a76654-ae48-45c9-aecf-841f20656540"),
    "40a76654-ae48-45c9-aecf-841f20656540",
  );
  assert.match(
    announcementFileUrl("0f17e17e-cf41-43a6-9b15-df754bad1af4", "ประกาศTOR.pdf"),
    /^https:\/\/egp2\.bangkok\.go\.th\/api\/file\/0f17e17e-cf41-43a6-9b15-df754bad1af4\//,
  );
  assert.equal(
    announcementFileUrl("abc", "https://cdn.example/file.pdf"),
    "https://cdn.example/file.pdf",
  );
});

test("text-layer detection keeps born-digital PDFs off the OCR path", () => {
  assert.equal(hasUsableTextLayer(""), false);
  assert.equal(hasUsableTextLayer("scan"), false);
  assert.equal(
    hasUsableTextLayer("จ้างบำรุงรักษาระบบเครือข่ายและโปรแกรมประยุกต์ จำนวน 8 รายการ ".repeat(4)),
    true,
  );
});

test("plain-text extract keeps visible lines and does not invent a deadline", () => {
  const extract = structurePlainText(
    "แผนจัดซื้อจัดจ้าง\n1) บำรุงรักษาระบบเครือข่าย\n2) โปรแกรมประยุกต์",
  );
  assert.match(extract.summaryTh, /แผนจัดซื้อจัดจ้าง/);
  assert.deepEqual(extract.requirements, ["1) บำรุงรักษาระบบเครือข่าย", "2) โปรแกรมประยุกต์"]);
  assert.equal(extract.deadline, undefined);
});

test("model JSON can be read from a fenced response", () => {
  const raw = parseModelJson('```json\n{"summaryTh":"แผน","summaryEn":"Plan","requirements":["A"]}\n```');
  const extract = normalizeExtract(raw);
  assert.equal(extract.summaryTh, "แผน");
  assert.equal(extract.summary, "Plan");
  assert.deepEqual(extract.requirements, ["A"]);
});

test("already extracted rows skip the same plan file", () => {
  assert.equal(
    alreadyExtracted(
      {
        ocr: {
          status: "ok",
          fileName: "plan.pdf",
          summaryTh: "แผน",
        },
      },
      "plan.pdf",
    ),
    true,
  );
  assert.equal(
    alreadyExtracted({ ocr: { status: "ok", fileName: "old.pdf", summaryTh: "แผน" } }, "plan.pdf"),
    false,
  );
});
