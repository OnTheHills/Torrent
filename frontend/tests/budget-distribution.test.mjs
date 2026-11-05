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

test("seven quantile groups plus the fixed overflow group when values are distinct", () => {
  const values = Array.from({ length: 70 }, (_, i) => (i + 1) * 1000);
  values.push(10000001);
  const bins = buildBudgetDistribution(records(values));
  assert.equal(bins.length, 8);
  assert.deepEqual(bins.map((bin) => bin.count), [10, 10, 10, 10, 10, 10, 10, 1]);
  assert.equal(bins[0].lower, 0);
  assert.equal(bins[0].upper, 10500);
  verify(bins, values);
});

test("exactly ฿10M stays in group seven; ฿10,000,001 goes in group eight", () => {
  const values = [1, 2, 3, 4, 5, 6, 10000000, 10000001];
  const bins = buildBudgetDistribution(records(values));
  assert.equal(bins.length, 8);
  assert.equal(bins[6].count, 1);
  assert.equal(bins[7].count, 1);
  assert.ok(belongs(10000000, bins[6]));
  assert.ok(!belongs(10000000, bins[7]));
  verify(bins, values);
});

test("skewed values produce quantile counts rather than equal budget widths", () => {
  const values = [1, 2, 3, 4, 5, 6, 10000000];
  const bins = buildBudgetDistribution(records(values));
  assert.deepEqual(bins.slice(0, 7).map((bin) => bin.count), [1, 1, 1, 1, 1, 1, 1]);
  assert.notEqual(bins[0].upper - bins[0].lower, bins[6].upper - bins[6].lower);
});

test("heavy ties retain seven groups when seven distinct lower values exist", () => {
  const values = [...Array(100).fill(100), 200, 300, 400, 500, 600, 700];
  const bins = buildBudgetDistribution(records(values));
  assert.equal(bins.length, 8);
  assert.deepEqual(bins.map((bin) => bin.count), [100, 1, 1, 1, 1, 1, 1, 0]);
  verify(bins, values);
});

test("ties collapse to meaningful ranges without splitting equal budgets", () => {
  for (const values of [[300], [300, 300, 300], [100, 100, 200, 200, 200], [10000000], [10000001]]) {
    const bins = buildBudgetDistribution(records(values));
    assert.ok(bins.length <= 3);
    verify(bins, values);
    for (const value of new Set(values)) {
      const bin = bins.find((entry) => belongs(value, entry));
      assert.equal(bin.count, values.filter((entry) => belongs(entry, bin)).length);
    }
  }
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

test("fractional thresholds and close labels keep matching boundaries", () => {
  const values = Array.from({ length: 7 }, (_, i) => 1000000 + i / 10);
  const bins = buildBudgetDistribution(records(values));
  const boundaries = bins.slice(0, -2).map((bin) => bin.upper);
  for (const value of boundaries) {
    assert.equal(bins.filter((bin) => belongs(value, bin)).length, 1);
    assert.ok(belongs(value, bins[bins.findIndex((bin) => bin.upper === value) + 1]));
  }
  const labels = budgetBoundaryLabels(bins);
  assert.equal(labels.length, 8);
  assert.equal(new Set(labels).size, 8);
  assert.ok(labels.every((label) => !label.includes("∞")));
  assert.deepEqual(budgetBoundaryLabels([]), []);
  verify(bins, values);
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
