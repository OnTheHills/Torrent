const assert = require("node:assert/strict");
const { test } = require("node:test");
const dns = require("node:dns/promises");
const { validateTorUrl, fetchTorUrl } = require("@/utils/torFetch");
const { downloadTor } = require("@/services/tor/ocr/ocrEgp");
const { downloadAnnouncementPdf } = require("@/services/tor/api/bmaEgp2/files");
const { downloadAnnouncement } = require("@/services/tor/smeAnnouncement");
const admin = require("@/services/admin/adminService");
const TOR = require("@/models/tor/TOR");

test("TOR destinations permit only the required hosts on HTTPS port 443", () => {
  for (const [host, path] of [
    ["process5.gprocurement.go.th", "/egp-upload-service/v1/downloadFileTest?fileId=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    ["egp2.bangkok.go.th", "/api/file/ba56605e-7f5a-4717-8944-e9a23c11b606/tor.pdf"],
    ["adminapiegp.bangkok.go.th", "/Uploads/tor.pdf"],
  ]) {
    for (const port of ["", ":443"]) {
      assert.equal(validateTorUrl(`https://${host}${port}${path}`).hostname, host);
    }
  }
});

const blocked = [
  "http://process5.gprocurement.go.th/file.pdf",
  "file:///etc/passwd",
  "mongodb://localhost:27017/torrent",
  "https://localhost:3000/file.pdf",
  "https://127.0.0.1:5175/file.pdf",
  "https://[::1]/file.pdf",
  "https://169.254.169.254/latest/meta-data",
  "https://process5.gprocurement.go.th:3000/file.pdf",
  "https://process5.gprocurement.go.th:5175/file.pdf",
  "https://process5.gprocurement.go.th:27017/file.pdf",
  "https://process5.gprocurement.go.th.evil.example/file.pdf",
  "https://unlisted.gprocurement.go.th/file.pdf",
  "https://process5.gprocurement.go.th@evil.example/file.pdf",
  "https://user:password@process5.gprocurement.go.th/file.pdf",
  "https://process5.gprocurement.go.th\\@evil.example/file.pdf",
  "https://process5.gprocurement.go.th/\nfile.pdf",
  "not a URL",
];

for (const url of blocked) {
  test(`TOR fetch blocks ${JSON.stringify(url)} before network access`, async (t) => {
    t.mock.method(globalThis, "fetch", () => assert.fail("Blocked URL reached fetch"));
    await assert.rejects(fetchTorUrl(url), { statusCode: 400 });
  });
}

test("each downloader restricts destinations to its own source", async (t) => {
  t.mock.method(globalThis, "fetch", () => assert.fail("Wrong source reached fetch"));
  await assert.rejects(downloadTor("https://egp2.bangkok.go.th/file.pdf"), { statusCode: 400 });
  await assert.rejects(downloadAnnouncementPdf("https://process5.gprocurement.go.th/egp-upload-service/v1/downloadFileTest?fileId=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "id"), { statusCode: 400 });
  // This check runs before invoking curl.
  await assert.rejects(downloadAnnouncement("https://localhost:3000/file.pdf"), { statusCode: 400 });
});

test("admin PDF proxy rejects an unsafe stored URL before download", async (t) => {
  t.mock.method(TOR, "findById", () => ({ lean: async () => ({ torPdfPath: "https://localhost:5175/private.pdf" }) }));
  await assert.rejects(admin.streamTorPdf("507f1f77bcf86cd799439011"), { statusCode: 400 });
});

test("allowed fetch preserves request options and prevents automatic redirects", async (t) => {
  t.mock.method(dns, "lookup", async () => [{ address: "8.8.8.8", family: 4 }]);
  const expected = { ok: true };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url.hostname, "process5.gprocurement.go.th");
    assert.equal(options.method, "HEAD");
    assert.equal(options.redirect, "error");
    assert.ok(options.signal instanceof AbortSignal);
    return expected;
  });
  assert.equal(await fetchTorUrl("https://process5.gprocurement.go.th/egp-upload-service/v1/downloadFileTest?fileId=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
    method: "HEAD", redirect: "follow",
  }), expected);
});
