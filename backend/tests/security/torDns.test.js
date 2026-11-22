const assert = require("node:assert/strict");
const { test } = require("node:test");
const dns = require("node:dns/promises");
const { isIP } = require("node:net");
const {
  isPublicAddress, resolveTorDestination, pinnedLookup, fetchTorUrl,
} = require("@/utils/torFetch");

const URL = "https://process5.gprocurement.go.th/egp-upload-service/v1/downloadFileTest?fileId=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const unsafe = [
  "0.0.0.0", "10.1.2.3", "127.0.0.1", "172.16.0.1", "172.31.255.255",
  "192.168.1.1", "169.254.169.254", "100.64.0.1", "192.0.2.1",
  "198.18.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "255.255.255.255",
  "::", "::1", "fc00::1", "fd00::1", "fe80::1", "ff02::1", "2001:db8::1",
  "::ffff:127.0.0.1", "::ffff:8.8.8.8", "64:ff9b::a00:1", "2002:a00:1::1",
];

for (const address of unsafe) {
  test(`TOR DNS rejects ${address} before any HTTP request`, async (t) => {
    assert.equal(isPublicAddress(address), false);
    t.mock.method(dns, "lookup", async () => [{ address, family: isIP(address) }]);
    t.mock.method(globalThis, "fetch", () => assert.fail("Unsafe DNS answer reached HTTP"));
    await assert.rejects(fetchTorUrl(URL), { statusCode: 400 });
  });
}

test("empty, mixed, and malformed DNS answers fail closed", async (t) => {
  let records;
  t.mock.method(dns, "lookup", async () => records);
  for (records of [
    [],
    [{ address: "8.8.8.8", family: 4 }, { address: "10.0.0.1", family: 4 }],
    [{ address: "8.8.8.8", family: 4 }, { address: "fd00::1", family: 6 }],
    [{ address: "8.8.8.8", family: 6 }],
    [{ address: "invalid", family: 4 }],
  ]) {
    await assert.rejects(resolveTorDestination(URL), { statusCode: 400 });
  }
});

test("DNS failures stop the request", async (t) => {
  t.mock.method(dns, "lookup", async () => { throw Object.assign(new Error("DNS failed"), { code: "ENOTFOUND" }); });
  t.mock.method(globalThis, "fetch", () => assert.fail("Failed DNS lookup reached HTTP"));
  await assert.rejects(fetchTorUrl(URL), { code: "ENOTFOUND" });
});

test("a stalled DNS lookup times out before HTTP access", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(dns, "lookup", () => new Promise(() => {}));
  t.mock.method(globalThis, "fetch", () => assert.fail("Stalled DNS lookup reached HTTP"));
  const pending = assert.rejects(fetchTorUrl(URL), /DNS lookup timed out/);
  t.mock.timers.tick(10000);
  await pending;
});

test("IPv4 and IPv6 connections remain pinned even if DNS changes", async (t) => {
  for (const address of ["8.8.8.8", "2001:4860:4860::8888"]) {
    const family = isIP(address);
    const lookup = t.mock.method(dns, "lookup", async () => [{ address, family }]);
    const destination = await resolveTorDestination(URL);
    assert.deepEqual(lookup.mock.calls[0].arguments, ["process5.gprocurement.go.th", { all: true, verbatim: true }]);
    lookup.mock.mockImplementation(() => assert.fail("Connection performed a second DNS lookup"));
    const connectLookup = pinnedLookup(destination);
    connectLookup(destination.url.hostname, {}, (error, result, resultFamily) => {
      assert.ifError(error);
      assert.equal(result, address);
      assert.equal(resultFamily, family);
    });
    connectLookup(destination.url.hostname, { all: true }, (error, results) => {
      assert.ifError(error);
      assert.deepEqual(results, [{ address, family }]);
    });
    connectLookup("localhost", {}, (error) => assert.ok(error));
    lookup.mock.restore();
  }
});

test("HTTP requests always use the guarded dispatcher, overriding caller options", async (t) => {
  t.mock.method(dns, "lookup", async () => [{ address: "8.8.8.8", family: 4 }]);
  const unguarded = {};
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url.hostname, "process5.gprocurement.go.th");
    assert.notEqual(options.dispatcher, unguarded);
    assert.equal(typeof options.dispatcher.dispatch, "function");
    assert.equal(options.redirect, "error");
    return { ok: true };
  });
  await fetchTorUrl(URL, { dispatcher: unguarded, redirect: "follow" });
});
