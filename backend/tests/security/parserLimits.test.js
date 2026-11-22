const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readBoundedBytes, boundedText, MAX_TEXT_CHARS, MAX_FEED_BYTES } = require("@/utils/boundedText");
const { parseXml, MAX_XML_DEPTH, MAX_XML_ELEMENTS } = require("@/utils/xmlText");
const { parseRssItems, decodeRss, stripTags } = require("@/services/tor/api/egpRss/parse");
const { cleanPdfText } = require("@/services/tor/ocr/readPdfText");
const source = require("@/services/tor/api/process3Process5/fetch");

const tooLarge = (error) => error.code === "UPSTREAM_BODY_TOO_LARGE";

test("upstream byte reader preserves valid chunked bytes at the limit", async () => {
  const chunks = [Buffer.from("ก"), Buffer.from("TOR")];
  const response = new Response(new ReadableStream({
    start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); },
  }));
  assert.deepEqual(await readBoundedBytes(response, 6), Buffer.concat(chunks));
  assert.equal((await readBoundedBytes(new Response(null))).length, 0);
});

for (const declared of [undefined, "1", "invalid"]) {
  test(`oversized stream is canceled even when content-length is ${declared}`, async () => {
    let canceled = false;
    let reads = 0;
    const stream = new ReadableStream({
      pull(controller) { reads++; controller.enqueue(Buffer.alloc(4)); },
      cancel() { canceled = true; },
    }, { highWaterMark: 0 });
    const response = new Response(stream, { headers: declared === undefined ? {} : { "content-length": declared } });
    await assert.rejects(readBoundedBytes(response, 5), tooLarge);
    assert.equal(canceled, true);
    assert.equal(reads, 2);
  });
}

test("declared oversized response is rejected without reading the stream", async () => {
  let canceled = false;
  const response = new Response(new ReadableStream({
    pull() { assert.fail("Declared oversized response was read"); },
    cancel() { canceled = true; },
  }, { highWaterMark: 0 }), { headers: { "content-length": "100" } });
  await assert.rejects(readBoundedBytes(response, 5), tooLarge);
  assert.equal(canceled, true);
});

test("stream errors stop the reader instead of returning partial data", async () => {
  const response = new Response(new ReadableStream({ start(controller) { controller.error(new Error("broken stream")); } }));
  await assert.rejects(readBoundedBytes(response), /broken stream/);
});

test("decoded text, direct RSS parsing, RSS bytes, and PDF text enforce limits", () => {
  const oversized = "x".repeat(MAX_TEXT_CHARS + 1);
  assert.throws(() => boundedText(oversized), tooLarge);
  assert.throws(() => parseRssItems(oversized), tooLarge);
  assert.throws(() => decodeRss(Buffer.alloc(MAX_FEED_BYTES + 1)), tooLarge);
  assert.throws(() => cleanPdfText(oversized), tooLarge);
  assert.equal(boundedText("x".repeat(MAX_TEXT_CHARS)).length, MAX_TEXT_CHARS);
});

test("XML rejects DTD/entity definitions, malformed structures and excessive depth", () => {
  for (const xml of [
    '<!DOCTYPE rss SYSTEM "http://127.0.0.1/private"><rss/>',
    '<!DOCTYPE rss [<!ENTITY x "expanded">]><rss>&x;</rss>',
    '<rss><item></rss>', '<rss><![CDATA[unterminated</rss>',
  ]) assert.throws(() => parseXml(xml), (error) => error.code === "UPSTREAM_XML_INVALID");
  assert.throws(() => parseXml("<x>".repeat(MAX_XML_DEPTH + 1)), (error) => error.code === "UPSTREAM_XML_LIMIT");
  assert.throws(() => parseXml("<rss>" + "<x/>".repeat(MAX_XML_ELEMENTS) + "</rss>"), (error) => error.code === "UPSTREAM_XML_LIMIT");
});

test("RSS preserves CDATA, attributes, multilingual text, entities and item boundaries", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <!-- <item><title>Fake</title></item> -->
    <item id="one"><title><![CDATA[ระบบ <b>TOR</b>]]></title>
      <link>https://example.test/?a=1&amp;b=2</link>
      <description><![CDATA[หน่วยงาน ทดสอบ<br>งบประมาณ 1,500,000 บาท <item>not a feed item</item>]]></description>
      <pubDate>2026-11-21</pubDate>
    </item>
    <item><title>Second&nbsp;TOR</title><guid>second</guid></item>
  </channel></rss>`;
  const rows = parseRssItems(xml, { deptId: "1700" });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, "ระบบ TOR");
  assert.equal(rows[0].link, "https://example.test/?a=1&b=2");
  assert.equal(rows[0].budgetThb, 1500000);
  assert.equal(rows[0].department, "ทดสอบ");
  assert.equal(rows[0].deptId, "1700");
  assert.equal(rows[1].title, "Second TOR");
});

test("cleanup preserves whitespace semantics and does not interpret malformed CDATA", () => {
  assert.equal(cleanPdfText("  Title \t\r\nBody  spaces\n\n\n\nEnd  "), "Title\nBody  spaces\n\nEnd");
  assert.equal(stripTags("A   B \t\nC"), "A B\nC");
  assert.equal(stripTags("<![CDATA[unterminated"), "<![CDATA[unterminated");
});

test("RSS fetch entry point enforces the streaming limit before parsing", async (t) => {
  let canceled = false;
  t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(Buffer.alloc(MAX_FEED_BYTES + 1)); },
    cancel() { canceled = true; },
  })));
  await assert.rejects(source.feed("1700", "B0"), tooLarge);
  assert.equal(canceled, true);
});
