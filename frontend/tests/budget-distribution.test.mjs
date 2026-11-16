import assert from "node:assert/strict";
import { test } from "node:test";
import { budgetBoundaryLabels, buildBudgetDistribution } from "../src/lib/budget-distribution.ts";

const records = (values) => values.map((budgetThb, id) => ({ id: String(id), budgetThb }));
const total = (bins) => bins.reduce((sum, bin) => sum + bin.count, 0);
const belongs = (budget, bin) => (bin.includesLower ? budget >= bin.lower : budget > bin.lower) &&
  (budget < bin.upper || (bin.includesUpper && budget <= bin.upper));

function verify(bins, values) {
  assert.equal(total(bins), values.length);
  assert.equal(bins.at(-1).lower, 10000000);
  assert.equal(bins.at(-1).upper, Infinity);
  assert.equal(bins.at(-2).upper, 10000000);
  assert.equal(bins.at(-2).includesUpper, true);
  for (const bin of bins) assert.ok(bin.upper > bin.lower);
  for (const value of values) assert.equal(bins.filter((bin) => belongs(value, bin)).length, 1);
  for (let i = 0; i < bins.length - 1; i++) assert.equal(bins[i].upper, bins[i + 1].lower);
}

test("uses round budget bands plus the open group above ฿10M", () => {
  const values = [9_999, 10_000, 49_999, 50_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 10_000_001];
  const bins = buildBudgetDistribution(records(values));
  assert.equal(bins.length, 8);
  assert.deepEqual(bins.map((bin) => bin.upper), [10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, Infinity]);
  assert.deepEqual(bins.map((bin) => bin.count), [1, 2, 1, 1, 1, 1, 2, 1]);
  assert.ok(belongs(10_000_000, bins[6]));
  assert.ok(belongs(10_000_001, bins[7]));
  verify(bins, values);
});

test("equal budgets stay in one round band", () => {
  const values = [...Array(100).fill(100), 200, 12_000, 10_000_000];
  const bins = buildBudgetDistribution(records(values));
  assert.equal(bins.length, 8);
  assert.equal(bins[0].count, 101);
  assert.equal(bins[1].count, 1);
  assert.equal(bins[6].count, 1);
  verify(bins, values);
});

test("the fixed final group remains present with zero overflow records", () => {
  const bins = buildBudgetDistribution(records([1, 2, 3, 4, 5, 6, 7]));
  assert.equal(bins.length, 8);
  assert.equal(bins.at(-1).count, 0);
});

test("filters invalid values, converts numeric strings and deduplicates IDs", () => {
  const input = records([" 100 ", 700, null, undefined, "", " ", "bad", "1,000", 0, -5, NaN, Infinity, -Infinity, true, {}, []]);
  input.push(input[0]);
  assert.equal(total(buildBudgetDistribution(input)), 2);
  assert.deepEqual(buildBudgetDistribution([]), []);
  assert.deepEqual(buildBudgetDistribution(records([null, -1, 0, "bad"])), []);
  assert.equal(total(buildBudgetDistribution(records([100, 100]))), 2);
});

test("round boundaries keep distinct compact labels", () => {
  const bins = buildBudgetDistribution(records([1_000_000, 10_000_000]));
  const labels = budgetBoundaryLabels(bins);
  assert.deepEqual(labels, ["฿0", "฿10K", "฿50K", "฿100K", "฿500K", "฿1M", "฿5M", "฿10M"]);
  assert.ok(belongs(10_000_000, bins[6]));
  assert.ok(!belongs(10_000_000, bins[7]));
  assert.deepEqual(budgetBoundaryLabels([]), []);
  verify(bins, [1_000_000, 10_000_000]);
});

test("large datasets and extreme finite budgets retain every valid record", () => {
  const values = Array.from({ length: 10000 }, (_, i) => (i + 1) / 100);
  values.push(Number.MAX_VALUE, Number.MIN_VALUE);
  verify(buildBudgetDistribution(records(values)), values);
  verify(buildBudgetDistribution(records([Number.MIN_VALUE])), [Number.MIN_VALUE]);
});

test("new data recomputes distribution without mutating input", () => {
  const input = Object.freeze(records([10, 70]).map(Object.freeze));
  assert.equal(total(buildBudgetDistribution(input)), 2);
  const bins = buildBudgetDistribution([...input, { id: "new", budgetThb: 10000001 }]);
  assert.equal(total(bins), 3);
  assert.equal(bins.at(-1).count, 1);
});
