const assert = require("node:assert/strict");
const { test } = require("node:test");
const dns = require("node:dns/promises");
const childProcess = require("node:child_process");
const fs = require("node:fs/promises");

test("both curl downloaders reject private DNS and pin public IPv4/IPv6 without proxies", async (t) => {
  let records = [{ address: "127.0.0.1", family: 4 }];
  t.mock.method(dns, "lookup", async () => records);
  const invocations = [];
  // Install before requiring services: they promisify execFile at load time.
  const originalExecFile = childProcess.execFile;
  t.after(() => { childProcess.execFile = originalExecFile; });
  // Replace the function itself so util.promisify does not pick up the native
  // execFile's custom promisifier through a mock proxy.
  childProcess.execFile = (command, args, options, callback) => {
    invocations.push({ command, args });
    const writes = [fs.writeFile(args[args.indexOf("-o") + 1], "%PDF-test")];
    if (args.includes("-D")) {
      writes.push(fs.writeFile(args[args.indexOf("-D") + 1], "Content-Disposition: attachment; filename=tor.pdf\r\n"));
    }
    Promise.all(writes).then(() => callback(null, "", ""), callback);
  };
  const admin = require("@/services/admin/adminService");
  const sme = require("@/services/tor/smeAnnouncement");
  const TOR = require("@/models/tor/TOR");
  const url = "https://process5.gprocurement.go.th/egp-upload-service/v1/downloadFileTest?fileId=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  t.mock.method(TOR, "findById", () => ({ lean: async () => ({ torPdfPath: url }) }));
  const adminDownload = () => admin.streamTorPdf("507f1f77bcf86cd799439011");
  await assert.rejects(adminDownload(), { statusCode: 400 });
  await assert.rejects(sme.downloadAnnouncement(url), { statusCode: 400 });
  assert.equal(invocations.length, 0);

  for (const record of [
    { address: "8.8.8.8", family: 4 },
    { address: "2001:4860:4860::8888", family: 6 },
  ]) {
    records = [record];
    assert.equal((await adminDownload()).bytes.toString(), "%PDF-test");
    assert.equal((await sme.downloadAnnouncement(url)).bytes.toString(), "%PDF-test");
    for (const { command, args } of invocations.splice(0)) {
      assert.equal(command, "curl");
      assert.equal(args[0], "-q");
      assert.equal(args[args.indexOf("--noproxy") + 1], "*");
      const ip = record.family === 6 ? `[${record.address}]` : record.address;
      assert.equal(args[args.indexOf("--resolve") + 1], `process5.gprocurement.go.th:443:${ip}`);
      assert.ok(args.includes("--no-location"));
      assert.equal(args.includes("-L"), false);
      assert.equal(args[args.indexOf("--proto") + 1], "=https");
      assert.deepEqual(args.slice(-2), ["--", url]);
    }
  }
});
