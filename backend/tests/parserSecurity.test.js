const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Readable } = require("node:stream");
const express = require("express");
const { certificateUpload } = require("@/middleware/certificateUpload");
const { parseXml, xmlText } = require("@/utils/xmlText");
const { parseRssItems, decodeRss } = require("@/services/tor/api/egpRss/parse");
const { parseModelJson, normalizeExtract } = require("@/services/tor/ocr/extractPlanPdf");
const { objectBody, requireObjectId } = require("@/utils/validate");
const { validateTorUrl } = require("@/utils/torFetch");
const { assertSafeOutboundUrl } = require("@/utils/outboundUrl");
const source = require("@/services/tor/api/process3Process5/fetch");
const User = require("@/models/user/User");

function httpJson(text) {
  return new Promise((resolve, reject) => {
    const bytes = Buffer.from(text);
    const req = Readable.from([bytes]);
    req.headers = { "content-type": "application/json", "content-length": String(bytes.length) };
    express.json()(req, {}, (error) => error ? reject(error) : resolve(req.body));
  });
}
async function multipartJson(text) {
  const form = new FormData();
  form.set("profile", text);
  const encoded = new Request("http://test.invalid", { method: "POST", body: form });
  const bytes = Buffer.from(await encoded.arrayBuffer());
  const req = Readable.from([bytes]);
  req.headers = { "content-type": encoded.headers.get("content-type"), "content-length": String(bytes.length) };
  req.is = () => true;
  return new Promise((resolve, reject) => {
    const res = { status(code) { this.code = code; return this; }, json(body) { reject(Object.assign(new Error(body.message), { status: this.code })); } };
    void certificateUpload(req, res, () => resolve(req.body));
  });
}

for (const declaration of [
  '<!DOCTYPE rss SYSTEM "file:///etc/passwd">',
  '<!DOCTYPE rss [<!ENTITY xxe SYSTEM "http://127.0.0.1:5175/private">]>',
  '<!DOCTYPE rss [<!ENTITY % remote SYSTEM "http://169.254.169.254/latest/meta-data/">%remote;]>',
  '<!DOCTYPE rss [<!ENTITY a "ha"><!ENTITY b "&a;&a;&a;&a;">]>',
]) {
  test(`V1.5.1: XML and RSS entry points reject DTD/external entities: ${declaration}`, (t) => {
    t.mock.method(globalThis, "fetch", () => assert.fail("XML tried to fetch an external entity"));
    const xml = `${declaration}<rss><channel><item><title>&xxe;</title><guid>one</guid></item></channel></rss>`;
    for (const parse of [parseXml, parseRssItems]) {
      assert.throws(() => parse(xml), (error) => error.code === "UPSTREAM_XML_INVALID");
    }
  });
}

test("V1.5.1: XInclude is inert and never loads its resource", (t) => {
  t.mock.method(globalThis, "fetch", () => assert.fail("XInclude was fetched"));
  const root = parseXml('<root xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="file:///etc/passwd" parse="text"/></root>');
  assert.equal(xmlText(root).trim(), "");
});

test("V1.5.1: project-detail XML rejects DTD before mapping any data", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    assert.equal(calls, 1, "Unexpected additional request during XML parsing");
    return new Response('<!DOCTYPE ApiSuccessView [<!ENTITY x SYSTEM "file:///etc/passwd">]><ApiSuccessView/>', { headers: { "content-type": "application/xml" } });
  });
  await assert.rejects(source.projectDetail("69109200267"), (error) => error.code === "UPSTREAM_XML_INVALID");
});

for (const input of [
  '{"__proto__":{"polluted":"yes"},"summaryEn":"safe"}',
  '{"constructor":{"prototype":{"polluted":"yes"}},"summaryEn":"safe"}',
  '{"$type":"System.Diagnostics.Process","__type":"Function","summaryEn":"safe"}',
  '{"summaryEn":"_$$ND_FUNC$$_function(){globalThis.__deserializationExecuted=true;}()"}',
]) {
  test(`V1.5.2: untrusted objects stay data and cannot instantiate types or execute code: ${input}`, async () => {
    const parsed = await httpJson(input);
    assert.deepEqual(await multipartJson(input), parsed);
    assert.deepEqual(parseModelJson(input), parsed);
    const normalized = normalizeExtract(parsed);
    assert.equal(Object.hasOwn(normalized, "__proto__"), false);
    assert.equal(Object.hasOwn(normalized, "$type"), false);
    assert.equal(Object.hasOwn(normalized, "constructor"), false);
    assert.equal(Object.prototype.polluted, undefined);
    assert.equal(globalThis.__deserializationExecuted, undefined);
  });
}

test("V1.5.2: application boundaries reject client-defined object types in scalar fields", async () => {
  for (const body of [null, [], "text", 42]) assert.throws(() => objectBody(body), { statusCode: 400 });
  assert.throws(() => requireObjectId({ $oid: "507f1f77bcf86cd799439011" }), { statusCode: 404 });
  const user = new User({ email: "test@example.invalid", role: { $type: "admin" } });
  await assert.rejects(user.validate());
});

for (const text of [
  '{"title":"ระบบ TOR 😀","budget":0,"enabled":false,"nothing":null}',
  '{"title":"\\u0e01\\ud83d\\ude00","values":[1,2]}',
  '{"title":"first","title":"last"}',
  '{"integer":9007199254740993,"negativeZero":-0}',
  '\ufeff{"title":"UTF-8 BOM"}',
]) {
  test(`V1.5.3: HTTP, multipart and model JSON parsers agree: ${text}`, async () => {
    const expected = await httpJson(text);
    assert.deepEqual(await multipartJson(text), expected);
    assert.deepEqual(parseModelJson(text), expected);
  });
}

for (const text of ['{"title":1,}', '{"n":NaN}', '{"a":undefined}', '{title:"bad"}']) {
  test(`V1.5.3: JSON entry points consistently reject malformed JSON: ${text}`, async () => {
    await assert.rejects(httpJson(text));
    await assert.rejects(multipartJson(text));
    assert.equal(parseModelJson(text), null);
  });
}

for (const url of [
  'https://process5.gprocurement.go.th:443/egp-upload-service/v1/downloadFileTest?fileId=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'https://process5.gprocurement.go.th/egp-upload-service/v1/%2e%2e/v1/downloadFileTest?fileId=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'https://process5.gprocurement.go.th@127.0.0.1/private',
  'https://process5.gprocurement.go.th:3000/private',
  'https://egp2.bangkok.go.th/api/file/ba56605e-7f5a-4717-8944-e9a23c11b606/TOR%252fsecret.pdf',
]) {
  test(`V1.5.3: both outbound URL validators make the same decision: ${url}`, () => {
    const result = (parse) => { try { return { value: parse(url) }; } catch (error) { return { status: error.statusCode }; } };
    assert.deepEqual(result(assertSafeOutboundUrl), result((value) => validateTorUrl(value).href));
  });
}

test("V1.5.3: RSS and project XML preserve the same UTF-8 text and entities", async (t) => {
  const value = "ระบบ ก & TOR 😀";
  const encoded = "ระบบ ก &amp; TOR 😀";
  const rss = Buffer.from(`<rss><channel><item><title>${encoded}</title><guid>one</guid></item></channel></rss>`);
  assert.equal(parseRssItems(decodeRss(rss))[0].title, value);
  t.mock.method(globalThis, "fetch", async () => new Response(`<ApiSuccessView><response><responseCode>0</responseCode></response><data><projectId>69109200267</projectId><projectName>${encoded}</projectName></data></ApiSuccessView>`, { headers: { "content-type": "application/xml; charset=utf-8" } }));
  assert.equal((await source.projectDetail("69109200267")).project.projectName, value);
});

test("V1.5.3: RSS and project XML consistently decode declared Windows-874 text", async (t) => {
  // Windows-874 byte A1 is Thai ก. The declaration is deliberately identical.
  const document = (body) => Buffer.concat([Buffer.from('<?xml version="1.0" encoding="windows-874"?>' + body.split("CHAR")[0]), Buffer.from([0xa1]), Buffer.from(body.split("CHAR")[1])]);
  const rss = document('<rss><channel><item><title>CHAR</title><guid>one</guid></item></channel></rss>');
  const expected = parseRssItems(decodeRss(rss))[0].title;
  assert.equal(expected, "ก");
  t.mock.method(globalThis, "fetch", async () => new Response(document('<ApiSuccessView><response><responseCode>0</responseCode></response><data><projectName>CHAR</projectName><projectId>69109200267</projectId></data></ApiSuccessView>'), { headers: { "content-type": "application/xml; charset=windows-874" } }));
  assert.equal((await source.projectDetail("69109200267")).project.projectName, expected);
});
