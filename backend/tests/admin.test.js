const assert = require("node:assert/strict");
const { test } = require("node:test");
const { matchingSoftwareTerms } = require("@/services/tor/api/dataGo/adapter");
const { compareTitles } = require("@/services/admin/classification");
const {
  accuracyFromReviews,
  closingWindow,
  confidenceOf,
  integrityReasons,
  isReviewEligible,
  latestRunsBySource,
  resolveIntegrityFields,
  reviewBand,
  sourceVerdict,
  stageClauses,
} = require("@/services/admin/scoring");

test("a newer full sync stands in as each feed's latest run", () => {
  const sources = [
    { key: "dataGo", source: "DATA-GO-EGP" },
    { key: "egpRss", source: "EGP-RSS" },
  ];
  const latest = latestRunsBySource(
    [
      { sourceKey: "dataGo", status: "success", fetched: 5, finishedAt: "2026-10-17T00:00:00Z" },
      {
        sourceKey: "all",
        trigger: "auto",
        status: "success",
        finishedAt: "2026-10-18T00:00:00Z",
        summary: [{ source: "DATA-GO-EGP", fetched: 9, matched: 4, created: 2 }],
      },
    ],
    sources,
  );
  assert.equal(latest.get("dataGo").fetched, 9);
  assert.equal(latest.get("dataGo").createdCount, 2);
  assert.equal(latest.get("dataGo").trigger, "auto");
  assert.equal(latest.has("egpRss"), false);
});

test("confidence drops for missing budget and deadline and sets the review band", () => {
  const scored = confidenceOf({
    title: "จ้างพัฒนาระบบเว็บไซต์ของหน่วยงาน",
    category: "Web Application",
    department: "กรมบัญชีกลาง",
    publishedAt: new Date(),
    ocr: { status: "ok" },
  });
  assert.equal(scored.confidence, 60);
  assert.deepEqual(scored.missing, ["budget", "deadline"]);
  assert.equal(reviewBand(scored.confidence), "manual");
  assert.equal(reviewBand(85), "review");
  assert.equal(reviewBand(95), "auto");
});

test("stage filter isolates closing-soon deadlines within seven Bangkok days", () => {
  const now = new Date("2026-10-18T12:00:00+07:00");
  const { today, until } = closingWindow(now);
  assert.equal(today.toISOString(), "2026-10-17T17:00:00.000Z");
  assert.equal(until.toISOString(), "2026-10-24T17:00:00.000Z");
  const closing = stageClauses(["closing"], now);
  assert.deepEqual(closing, {
    $or: [{ deadline: { $gte: today, $lte: until } }],
  });
});

test("review eligibility keeps open deadlines and recent undated opens", () => {
  const now = new Date("2026-10-18T12:00:00+07:00");
  assert.equal(
    isReviewEligible({ deadline: new Date("2026-10-20T00:00:00+07:00"), status: "published" }, now),
    true,
  );
  assert.equal(
    isReviewEligible({ deadline: new Date("2026-10-01T00:00:00+07:00"), status: "published" }, now),
    false,
  );
  assert.equal(
    isReviewEligible({ status: "awarded", publishedAt: new Date("2026-10-17T00:00:00+07:00") }, now),
    false,
  );
  assert.equal(
    isReviewEligible(
      { status: "published", publishedAt: new Date("2026-09-01T00:00:00+07:00") },
      now,
    ),
    true,
  );
  assert.equal(
    isReviewEligible(
      { status: "published", publishedAt: new Date("2026-01-01T00:00:00+07:00") },
      now,
    ),
    false,
  );
});

test("custom exclude rules remove a title the default list would keep", () => {
  const title = "จ้างพัฒนาเว็บไซต์ของหน่วยงาน";
  assert.ok(matchingSoftwareTerms(title).length > 0);
  assert.deepEqual(matchingSoftwareTerms(title, { excludeKeywords: ["เว็บไซต์"] }), []);
});

test("rule preview counts titles that would leave or join the catalog", () => {
  const titles = ["จ้างพัฒนาเว็บไซต์ของหน่วยงาน", "ซื้อครุภัณฑ์คอมพิวเตอร์"];
  const current = { includeKeywords: ["พัฒนาเว็บไซต์"], excludeKeywords: ["ซื้อ"] };
  const next = { includeKeywords: ["พัฒนาเว็บไซต์"], excludeKeywords: ["เว็บไซต์"] };
  const preview = compareTitles(titles, current, next);
  assert.equal(preview.currentMatch, 1);
  assert.equal(preview.nextMatch, 0);
  assert.equal(preview.removed, 1);
});

test("source verdict follows failure, staleness, and empty fetches", () => {
  const now = Date.parse("2026-10-17T00:00:00Z");
  assert.equal(sourceVerdict(null, now), "yellow");
  assert.equal(sourceVerdict({ status: "failed", finishedAt: now }, now), "red");
  assert.equal(sourceVerdict({ status: "success", sourceKey: "dataGo", fetched: 0, finishedAt: now }, now), "red");
  assert.equal(sourceVerdict({ status: "success", sourceKey: "dataGo", fetched: 10, finishedAt: now - 48 * 60 * 60 * 1000 }, now), "yellow");
  assert.equal(sourceVerdict({ status: "success", sourceKey: "dataGo", fetched: 10, finishedAt: now }, now), "green");
});

test("integrity flags short windows and budget outliers", () => {
  const publishedAt = new Date("2026-10-01");
  const deadline = new Date("2026-10-02");
  assert.deepEqual(
    integrityReasons({ status: "published", publishedAt, deadline, budgetThb: 100, category: "Web Application" }, { median: 1_000_000, count: 8 }),
    ["short-window", "budget-low"],
  );
});

test("resolveIntegrityFields marks Watch out from rules or Vertex", () => {
  assert.equal(resolveIntegrityFields([]).integrityStatus, "clear");
  assert.equal(resolveIntegrityFields(["short-window"]).integrityStatus, "flagged");
  assert.equal(
    resolveIntegrityFields([], { ok: true, integrity: "watch", integrityFlags: ["other"], integrityReason: "ช่วงรับสั้นผิดปกติ" })
      .integrityStatus,
    "flagged",
  );
  assert.match(
    resolveIntegrityFields(["budget-high"], { ok: true, integrity: "clear", integrityFlags: [], integrityReason: "" })
      .integrityNote,
    /3×/,
  );
});

test("accuracy counts corrected review fields against the fields that were checked", () => {
  const report = accuracyFromReviews([
    { checked: ["budgetThb", "deadline"], changes: [{ field: "budgetThb" }] },
    { checked: ["budgetThb", "deadline"], changes: [] },
  ]);
  assert.equal(report.sampleSize, 2);
  assert.equal(report.checked, 4);
  assert.equal(report.corrections, 1);
  assert.equal(report.accuracy, 75);
});
