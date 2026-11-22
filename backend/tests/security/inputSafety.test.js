const assert = require("node:assert/strict");
const { test } = require("node:test");
const TOR = require("@/models/tor/TOR");
const admin = require("@/services/admin/adminService");
const { getCertificate } = require("@/controllers/vendor/vendorProfileController");
const { alertMessage } = require("@/utils/email/alertTemplate");

// Exercise production service/controller boundaries. MongoDB is stubbed so these
// tests never read or modify real records. These are targeted V1.3.3 checks,
// not a complete ASVS assessment or browser XSS test.
async function searchFilter(t, q) {
  let captured;
  const chain = {
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    async lean() { return []; },
  };
  t.mock.method(TOR, "find", (filter) => { captured = filter; return chain; });
  t.mock.method(TOR, "countDocuments", async () => 0);
  t.mock.method(TOR, "distinct", async () => []);
  await admin.searchTors({ q });
  return captured.$and.find((clause) => clause.$or)?.$or;
}

for (const payload of [".*", "(a+)+$", "[", "a|b", "\\", "ระบบ (web).*"]) {
  test(`V1.3.3: admin search treats ${JSON.stringify(payload)} as literal text`, async (t) => {
    const clauses = await searchFilter(t, payload);
    const regex = clauses[0].title;
    assert.ok(regex instanceof RegExp);
    assert.equal(regex.test(`prefix ${payload} suffix`), true);
    assert.equal(regex.test("unrelated record"), false);
    assert.equal(clauses[2].refId, payload);
  });
}

test("V1.3.3: long admin search text is bounded before regex matching", async (t) => {
  const clauses = await searchFilter(t, "x".repeat(10000));
  assert.equal(clauses[0].title.source.length, 200);
  assert.equal(clauses[0].title.test("x".repeat(199)), false);
  assert.equal(clauses[0].title.test("x".repeat(200)), true);
});

test("V1.3.3: truncating search text must not split an escaped character", async (t) => {
  // Regression probe: slicing AFTER escaping leaves a trailing backslash.
  const clauses = await searchFilter(t, `${"x".repeat(199)}.*`);
  assert.equal(clauses[0].title.test(`${"x".repeat(199)}.`), true);
  assert.equal(clauses[0].title.test(`${"x".repeat(199)}z`), false);
});

for (const field of ["q", "status"]) {
  for (const value of [{ $ne: null }, { $regex: ".*" }, ["open"], 42, true, null]) {
    test(`V1.3.3: search rejects ${field}=${JSON.stringify(value)} before database access`, async (t) => {
      for (const method of ["find", "countDocuments", "distinct"]) {
        t.mock.method(TOR, method, () => assert.fail("Untrusted query value reached MongoDB"));
      }
      await assert.rejects(admin.searchTors({ [field]: value }), (error) => error.statusCode === 400);
    });
  }
}

test("V1.3.3: certificate path traversal is rejected before opening a file", async () => {
  for (const filename of ["../package.json", "..\\package.json", "%2e%2e%2fpackage.json", "/etc/passwd", "bad.png\0"]) {
    let status;
    const response = {
      status(value) { status = value; return this; },
      json(body) { return body; },
      sendFile() { assert.fail("Unsafe filename reached file access"); },
    };
    await getCertificate({ params: { filename }, user: { sub: "507f1f77bcf86cd799439011" } }, response);
    assert.equal(status, 404, filename);
  }
});

test("V1.3.3: email alert fields are HTML escaped in every alert variant", () => {
  const payload = '<img src=x onerror="alert(1)">';
  for (const kind of ["match", "deadline", "integrity"]) {
    const message = alertMessage(kind, {
      _id: "507f1f77bcf86cd799439011", title: payload, summary: payload,
      category: payload, department: payload,
    }, { matchPercent: 80, matchReason: payload });
    assert.equal(message.html.includes(payload), false);
    assert.equal(message.html.includes("<img"), false);
    assert.equal((message.html.match(/&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/g) || []).length, 5);
    // Plain text retains data; stripping characters everywhere is unnecessary.
    assert.ok(message.text.includes(payload));
  }
});

test("V1.3.3: email content is bounded and subject line breaks are removed", () => {
  const message = alertMessage("match", {
    _id: "507f1f77bcf86cd799439011",
    title: `Title\r\nBcc: test@example.invalid ${"T".repeat(1000)}`,
    summary: "S".repeat(1000),
  }, { matchPercent: 80, matchReason: "R".repeat(1000) });
  assert.doesNotMatch(message.subject, /[\r\n]/);
  assert.equal(message.subject.length, "Torrent match: ".length + 200);
  assert.ok(message.html.includes("S".repeat(320)));
  assert.equal(message.html.includes("S".repeat(321)), false);
  assert.ok(message.html.includes("R".repeat(220)));
  assert.equal(message.html.includes("R".repeat(221)), false);
});
