const test = require("node:test");
const assert = require("node:assert/strict");

const { parseAnnouncementBudget, parseBudget } = require("@/utils/torUtils");
const {
  decryptListingParam,
  encryptListingParam,
  projectIdFromFilename,
} = require("@/services/tor/api/smeGp/announcement");

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

test("listing param round-trips the e-GP project id", () => {
  const param = encryptListingParam("69019529847");
  assert.equal(decryptListingParam(param).projectId, "69019529847");
});

test("project id comes from the announcement PDF filename", () => {
  assert.equal(
    projectIdFromFilename("dant_69019529847_058c9256-dc94-4c8c-adbb-cc2a05bf2e8d.pdf"),
    "69019529847",
  );
});
