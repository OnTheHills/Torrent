const assert = require("node:assert/strict");
const { test } = require("node:test");
const { decodeXmlBytes } = require("@/utils/xmlDecode");
const { decodeRss } = require("@/services/tor/api/egpRss/parse");
const { MAX_FEED_BYTES } = require("@/utils/boundedText");
const invalid = (error) => error.code === "UPSTREAM_XML_ENCODING";
const thai = (encoding) => Buffer.concat([
  Buffer.from(`<?xml version="1.0" encoding="${encoding}"?><root>`),
  Buffer.from([0xa1]), Buffer.from("</root>"),
]);

for (const encoding of ["windows-874", "tis-620", "iso-8859-11"]) {
  test(`shared XML decoder preserves Thai for ${encoding}`, () => {
    const bytes = thai(encoding);
    const result = decodeXmlBytes(bytes, { contentType: 'application/xml; charset="WINDOWS-874"' });
    assert.ok(result.includes("<root>ก</root>"));
    assert.equal(decodeRss(bytes, 'application/xml; charset="WINDOWS-874"'), result);
  });
}

test("UTF-8 is the shared default, preserves Unicode and strips a UTF-8 BOM", () => {
  const text = "<root>ระบบ ก 😀</root>";
  for (const bytes of [Buffer.from(text), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text)])]) {
    assert.equal(decodeXmlBytes(bytes), text);
    assert.equal(decodeRss(bytes, "text/xml; charset=utf8"), text);
  }
});

test("an HTTP charset can select Thai decoding without an XML declaration", () => {
  const bytes = Buffer.concat([Buffer.from("<root>"), Buffer.from([0xa1]), Buffer.from("</root>")]);
  assert.equal(decodeXmlBytes(bytes, { contentType: "text/xml; charset=tis-620" }), "<root>ก</root>");
});

for (const [bytes, contentType] of [
  [thai("windows-874"), "application/xml; charset=utf-8"],
  [Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), thai("windows-874")]), ""],
  [Buffer.from('<root>ok</root>'), "text/xml; charset=utf-8; charset=windows-874"],
  [Buffer.from('<root>ok</root>'), "text/xml; charset=unknown-charset"],
  [thai("unknown-charset"), ""],
  [thai("utf-16"), ""],
  [Buffer.from([0xff, 0xfe, 0x3c, 0x00]), ""],
  [Buffer.concat([Buffer.from("<root>"), Buffer.from([0xc3]), Buffer.from("</root>")]), ""],
  [Buffer.from('<?xml version="1.0" encoding="utf-8" encoding="tis-620"?><root/>'), ""],
  [Buffer.from('<?xml ' + ' '.repeat(1100) + 'encoding="utf-8"?><root/>'), ""],
]) {
  test(`decoder rejects ambiguous/invalid encoding consistently (header=${contentType}, prefix=${bytes.subarray(0, 65).toString("hex")})`, () => {
    assert.throws(() => decodeXmlBytes(bytes, { contentType }), invalid);
    assert.throws(() => decodeRss(bytes, contentType), invalid);
  });
}

test("the shared decoder retains the pre-decode byte limit", () => {
  assert.throws(() => decodeXmlBytes(Buffer.alloc(MAX_FEED_BYTES + 1)), (error) => error.code === "UPSTREAM_BODY_TOO_LARGE");
});
