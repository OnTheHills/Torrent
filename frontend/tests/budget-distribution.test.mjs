import assert from "node:assert/strict";
import { test } from "node:test";
import { budgetBoundaryLabels, buildBudgetDistribution } from "../src/lib/budget-distribution.ts";

const records = (values) => values.map((budgetThb, id) => ({ id: String(id), budgetThb }));
const total = (bins) => bins.reduce((sum, bin) => sum + bin.count, 0);

test("six equal-width ascending bins count boundaries once and include the maximum", () => {
  const bins = buildBudgetDistribution(records([10, 20, 30, 40, 50, 60, 70]));
  assert.equal(bins.length, 6);
  assert.deepEqual(bins.map((bin) => bin.count), [1, 1, 1, 1, 1, 2]);
  assert.deepEqual(bins.map((bin) => bin.lower), [10, 20, 30, 40, 50, 60]);
  assert.deepEqual(bins.map((bin) => bin.upper), [20, 30, 40, 50, 60, 70]);
  assert.deepEqual(bins.map((bin) => bin.includesUpper), [false, false, false, false, false, true]);
  assert.equal(total(bins), 7);
});

test("filters invalid budgets, converts numeric strings, and retains zero-count intervals", () => {
  const bins = buildBudgetDistribution(records([" 100 ", 700, null, undefined, "", " ", "bad", "1,000", 0, -5, NaN, Infinity, -Infinity, true, {}, []]));
  assert.equal(total(bins), 2);
  assert.deepEqual(bins.map((bin) => bin.count), [1, 0, 0, 0, 0, 1]);
  assert.deepEqual(buildBudgetDistribution([]), []);
  assert.deepEqual(buildBudgetDistribution(records([null, -1, 0, "bad"])), []);
});

test("identical and singleton budgets still produce six bins", () => {
  for (const values of [[300], [300, 300, 300]]) {
    const bins = buildBudgetDistribution(records(values));
    assert.equal(bins.length, 6);
    assert.equal(bins[0].lower, 150);
    assert.equal(bins[5].upper, 300);
    assert.deepEqual(bins.map((bin) => bin.count), [0, 0, 0, 0, 0, values.length]);
  }
});

test("removes repeated database IDs without merging distinct TORs sharing a budget", () => {
  const row = { id: "a", budgetThb: 100 };
  assert.equal(total(buildBudgetDistribution([row, row, { id: "b", budgetThb: 100 }])), 2);
});

test("fractional boundaries obey the same rule as the tooltip ranges", () => {
  const initial = buildBudgetDistribution(records([0.1, 0.7]));
  const budgets = [initial[0].lower, ...initial.map((bin) => bin.upper)];
  const bins = buildBudgetDistribution(records(budgets));
  for (const budget of budgets) {
    const memberships = bins.filter((bin) => budget >= bin.lower && (budget < bin.upper || (bin.includesUpper && budget <= bin.upper)));
    assert.equal(memberships.length, 1);
  }
  assert.equal(total(bins), budgets.length);
});

test("narrow ranges have distinguishable labels and shared boundaries", () => {
  const bins = buildBudgetDistribution(records([1000000, 1000001]));
  const labels = budgetBoundaryLabels(bins);
  assert.equal(labels.length, 7);
  assert.equal(new Set(labels).size, 7);
  assert.deepEqual(budgetBoundaryLabels([]), []);
  for (let i = 0; i < 5; i++) assert.equal(bins[i].upper, bins[i + 1].lower);
});

test("counts large datasets and extreme finite budgets without dropping a record", () => {
  const values = Array.from({ length: 10000 }, (_, i) => (i + 1) / 100);
  values.push(Number.MAX_VALUE, Number.MIN_VALUE);
  assert.equal(total(buildBudgetDistribution(records(values))), values.length);
  assert.equal(total(buildBudgetDistribution(records([Number.MIN_VALUE]))), 1);
});

test("new data recomputes the distribution without mutating input", () => {
  const input = Object.freeze(records([10, 70]).map(Object.freeze));
  const before = buildBudgetDistribution(input);
  const after = buildBudgetDistribution([...input, { id: "new", budgetThb: 200 }]);
  assert.equal(total(before), 2);
  assert.equal(total(after), 3);
  assert.equal(after[5].upper, 200);
});
