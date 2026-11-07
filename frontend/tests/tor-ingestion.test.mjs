import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTorIngestionDays } from "../src/lib/tor-ingestion.ts";

const now = new Date("2026-11-05T12:00:00+07:00");
const record = (id, status, createdAt, extra = {}) => ({ id, status, createdAt, ...extra });

test("groups at Bangkok midnight using createdAt, independently of publication date", () => {
  const days = buildTorIngestionDays([
    record("1", "published", "2026-11-03T16:59:59.999Z", { publishedAt: "2020-01-01" }),
    record("2", "published", "2026-11-03T17:00:00.000Z"),
    record("3", "draft", "2026-11-03T18:00:00Z"),
  ], now);
  assert.deepEqual(days, [
    { date: "2026-11-03", published: 1, drafted: 0, closed: 0 },
    { date: "2026-11-04", published: 1, drafted: 1, closed: 0 },
    { date: "2026-11-05", published: 0, drafted: 0, closed: 0 },
  ]);
});

test("maps the stored source statuses into three categories", () => {
  const days = buildTorIngestionDays(
    ["published", "draft", "discovered", "closed", "awarded", "cancelled"].map((status, i) => record(String(i), status, now.toISOString())), now,
  );
  assert.deepEqual(days, [{ date: "2026-11-05", published: 1, drafted: 2, closed: 3 }]);
});

test("deduplicates source/refId pairs at earliest creation with latest stored status", () => {
  const records = [
    record("1", "draft", "2026-11-03T18:00:00Z", { source: "EGP-RSS", refId: "A", updatedAt: "2026-11-04T00:00:00Z" }),
    record("2", "awarded", "2026-11-04T18:00:00Z", { source: "EGP-RSS", refId: "A", updatedAt: "2026-11-05T00:00:00Z" }),
    record("3", "published", "2026-11-04T18:00:00Z", { source: "BMA-EGP2", refId: "A" }),
  ];
  records.push({ ...records[1] });
  const expected = [
    { date: "2026-11-04", published: 0, drafted: 0, closed: 1 },
    { date: "2026-11-05", published: 1, drafted: 0, closed: 0 },
  ];
  assert.deepEqual(buildTorIngestionDays(records, now), expected);
  assert.deepEqual(buildTorIngestionDays([...records].reverse(), now), expected);
});

test("keeps separate manual records and removes repeated database IDs", () => {
  const row = record("1", "draft", now.toISOString());
  const days = buildTorIngestionDays([row, row, record("2", "draft", now.toISOString())], now);
  assert.equal(days[0].drafted, 2);
});

test("fills internal gaps and leap days with zero counts", () => {
  const days = buildTorIngestionDays([
    record("1", "published", "2024-02-28T12:00:00+07:00"),
    record("2", "closed", "2024-03-01T12:00:00+07:00"),
  ], new Date("2024-03-01T12:00:00+07:00"));
  assert.deepEqual(days[1], { date: "2024-02-29", published: 0, drafted: 0, closed: 0 });
  assert.equal(days.length, 3);
});

test("empty, invalid-date and unsupported-status records do not invent counts", () => {
  assert.deepEqual(buildTorIngestionDays([], now), []);
  assert.deepEqual(buildTorIngestionDays([
    record("1", "published", undefined),
    record("2", "published", "not-a-date"),
    record("3", "unknown", now.toISOString()),
  ], now), []);
});

test("newly ingested records change the next aggregation", () => {
  const records = [record("1", "published", now.toISOString())];
  assert.equal(buildTorIngestionDays(records, now)[0].published, 1);
  records.push(record("2", "published", now.toISOString()));
  assert.equal(buildTorIngestionDays(records, now)[0].published, 2);
});
