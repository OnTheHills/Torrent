const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Worker } = require("node:worker_threads");
const { join } = require("node:path");
const TOR = require("@/models/tor/TOR");
const AuditLog = require("@/models/admin/AuditLog");
const classification = require("@/services/admin/classification");
const admin = require("@/services/admin/adminService");
const { stripTags } = require("@/services/tor/api/egpRss/parse");

test("RSS tag stripping preserves normal formatting and entity decoding", () => {
  assert.equal(stripTags("<p>Title &amp; scope</p><div>First<br>Second</div>"), "Title & scope\n First\nSecond");
  assert.equal(stripTags("<![CDATA[<b>TOR</b>]]>"), "TOR");
});

function probe(data, budgetMs = 2500) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(join(__dirname, "fixtures/regexProbe.cjs"), { workerData: data });
    let completed = false;
    const timer = setTimeout(() => {
      completed = true;
      void worker.terminate();
      reject(new Error(`${data.mode}: exceeded ${budgetMs}ms on ${data.length} input units (possible runaway regex)`));
    }, budgetMs);
    worker.once("message", (result) => {
      completed = true;
      clearTimeout(timer);
      resolve(result);
    });
    worker.once("error", (error) => {
      completed = true;
      clearTimeout(timer);
      reject(error);
    });
    worker.once("exit", (code) => {
      clearTimeout(timer);
      if (!completed) reject(new Error(`${data.mode}: worker exited without completing, code ${code}`));
    });
  });
}

async function searchPatterns(t, method, q) {
  let filter;
  const model = method === "auditLog" ? AuditLog : TOR;
  const chain = { sort() { return this; }, skip() { return this; }, limit() { return this; }, async lean() { return []; } };
  t.mock.method(model, "find", (query) => { filter = query; return chain; });
  t.mock.method(model, "countDocuments", async () => 0);
  t.mock.method(TOR, "distinct", async () => []);
  t.mock.method(classification, "readSettings", async () => ({ autoThreshold: 90, reviewThreshold: 80 }));
  await admin[method]({ q, sort: "newest" });
  const patterns = [];
  function visit(value) {
    if (value instanceof RegExp) patterns.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  }
  visit(filter);
  assert.ok(patterns.length > 0);
  return patterns;
}

for (const method of ["searchTors", "reviewQueue", "auditLog"]) {
  for (const payload of ["(a+)+$", "(a|aa)+$", "a.*b", "[", "\\", "ระบบ (web).*"]) {
    test(`V1.3.12: ${method} uses ${JSON.stringify(payload)} as literal search text`, async (t) => {
      for (const regex of await searchPatterns(t, method, payload)) {
        assert.equal(regex.test(`prefix ${payload} suffix`), true);
        assert.equal(regex.test("unrelated record"), false);
      }
    });
  }
  test(`V1.3.12: ${method} bounds input before escaping and handles the truncation boundary`, async (t) => {
    const input = "x".repeat(199) + "." + "y".repeat(10000);
    for (const regex of await searchPatterns(t, method, input)) {
      assert.equal(regex.test("x".repeat(199) + "."), true);
      assert.equal(regex.test("x".repeat(199) + "z"), false);
      assert.equal(regex.source.length, 201); // 200 literal characters; dot has an escape.
    }
  });
  test(`V1.3.12: ${method} malicious-pattern searches stay bounded on a long near-match`, async (t) => {
    const patterns = await searchPatterns(t, method, "(a+)+$");
    assert.deepEqual(await probe({ mode: "literal-search", patterns, length: 200000 }), { ok: true });
  });
  test(`V1.3.12: ${method} limits a long metacharacter-only search to 200 literal characters`, async (t) => {
    const patterns = await searchPatterns(t, method, "*".repeat(100000));
    for (const regex of patterns) {
      assert.equal(regex.source.length, 400); // Each of the 200 stars is escaped.
      assert.equal(regex.test("*".repeat(199)), false);
      assert.equal(regex.test("*".repeat(200)), true);
    }
    assert.deepEqual(await probe({ mode: "literal-search", patterns, length: 200000 }), { ok: true });
  });
}

for (const [mode, length] of [
  ["announcement-budget", 100000],
  ["rss-budget", 100000],
  ["rss-unclosed-items", 20000],
  ["rss-unclosed-cdata", 40000],
  ["rss-spaces", 100000],
  ["pdf-spaces", 100000],
  ["html-unclosed-tags", 100000],
  ["html-encoded-unclosed-tags", 100000],
]) {
  test(`V1.3.12: ${mode} finishes within the isolated CPU budget`, async () => {
    assert.deepEqual(await probe({ mode, length }), { ok: true });
  });
}
