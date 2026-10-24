const test = require("node:test");
const assert = require("node:assert/strict");

const { parseAnnouncementBudget, parseBudget } = require("@/utils/torUtils");
const {
  decryptListingParam,
  encryptListingParam,
  projectIdFromFilename,
  projectIdFromListing,
  stageFromEgp,
} = require("@/services/tor/smeAnnouncement");

test("parseBudget reads Thai digits from an announcement amount", () => {
  assert.equal(parseBudget("๒๕,๙๙๖,๔๕๔.๘๐"), 25996454.8);
  assert.equal(parseBudget("1,200,000"), 1200000);
});

test("parseAnnouncementBudget keeps the project amount, not the document number", () => {
  const text = [
    "เอกสารประกวดราคาอิเล็กทรอนิกส์เลขที่ ๒๕/๒๕๖๙",
    "เป็นเงินทั้งสิ้น จ้าง ๒๕,๙๙๖,๔๕๔.๘๐ บาท",
    "ประกาศ ณ วันที่ ๓๐ กันยายน พ.ศ. ๒๕๖๙",
  ].join("\n");
  assert.equal(parseAnnouncementBudget(text), 25996454.8);
});

test("parseAnnouncementBudget reads a column-scrambled e-GP notice", () => {
  const text = "ราคากลางของงาน ในการประกวดราคาครั้งนี้ เป็นเงินทั้งสิ้น\tbidding) จ้าง ๒๗,๓๓๖,๓๗๐.๙๒ บาท (ยี่สิบ";
  assert.equal(parseAnnouncementBudget(text), 27336370.92);
});

test("listing param round-trips the e-GP project id", () => {
  const param = encryptListingParam("69019529847");
  assert.equal(decryptListingParam(param).projectId, "69019529847");
});

test("e-GP project step decides whether an SME notice is still open", () => {
  assert.equal(
    stageFromEgp({ flowName: "จัดทำสัญญา/บริหารสัญญา", projectStatus: "A" }),
    "awarded",
  );
  assert.equal(
    stageFromEgp({
      flowName: "อนุมัติสั่งซื้อสั่งจ้างและประกาศผู้ชนะการเสนอราคา",
      announceType: "W0",
    }),
    "awarded",
  );
  assert.equal(
    stageFromEgp({ flowName: "หนังสือเชิญชวน/ประกาศเชิญชวน", projectStatus: "R" }),
    "cancelled",
  );
  assert.equal(
    stageFromEgp({
      flowName: "หนังสือเชิญชวน/ประกาศเชิญชวน",
      projectStatus: "A",
      announceType: "B3",
    }),
    "published",
  );
});

test("project id comes from an e-GP listing URL", () => {
  const param = encryptListingParam("69029257201");
  assert.equal(
    projectIdFromListing(
      `https://process5.gprocurement.go.th/egp-agpc01-web/announcement/procurement/${param}`,
    ),
    "69029257201",
  );
});

test("project id comes from the announcement PDF filename", () => {
  assert.equal(
    projectIdFromFilename("dant_69019529847_058c9256-dc94-4c8c-adbb-cc2a05bf2e8d.pdf"),
    "69019529847",
  );
});
