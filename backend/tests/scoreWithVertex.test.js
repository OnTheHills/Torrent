const assert = require("node:assert/strict");
const { test } = require("node:test");
const { scorePrompt } = require("@/services/tor/scoreWithVertex");

test("score prompt asks for trustworthiness and includes heuristic missing", () => {
  const prompt = scorePrompt(
    {
      titleTh: "จ้างพัฒนาระบบ",
      source: "DATA-GO-EGP",
      category: "Web Application",
      budgetThb: null,
      ocr: { status: "no_file" },
    },
    { confidence: 60, missing: ["budget", "deadline"] },
  );
  assert.match(prompt, /trustworthy/);
  assert.match(prompt, /DATA-GO-EGP/);
  assert.match(prompt, /"budget"/);
  assert.match(prompt, /ภาษาไทย/);
  assert.match(prompt, /Watch out/);
  assert.match(prompt, /integrityHints/);
});

test("score prompt pins today and formats Bangkok calendar dates", () => {
  const prompt = scorePrompt(
    {
      title: "System work",
      publishedAt: new Date("2026-10-08T00:00:00+07:00"),
      deadline: new Date("2026-10-20T00:00:00+07:00"),
    },
    {},
    new Date("2026-10-18T15:00:00+07:00"),
  );
  assert.match(prompt, /Today's date \(Asia\/Bangkok\) is 2026-10-18/);
  assert.match(prompt, /"publishedAt":"2026-10-08"/);
  assert.match(prompt, /"deadline":"2026-10-20"/);
  assert.match(prompt, /only 'future' if it is after today/);
});
