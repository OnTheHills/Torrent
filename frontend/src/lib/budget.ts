import type { BudgetBenchmark, Tor } from "@/types/tor";

// Median is more stable than an arithmetic mean when one procurement has an
// unusually large budget, so it is used as the category "กลาง" benchmark.
function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[midpoint - 1] + sorted[midpoint]) / 2);
  }

  return sorted[midpoint];
}

export function buildBudgetBenchmarks(tors: Tor[]): BudgetBenchmark[] {
  // Group raw TORs first; every chart/table consumes the same derived benchmark.
  const budgetsByCategory = new Map<string, number[]>();

  tors.forEach((tor) => {
    if (!tor.category || tor.budgetThb <= 0) return;

    const budgets = budgetsByCategory.get(tor.category) ?? [];
    budgets.push(tor.budgetThb);
    budgetsByCategory.set(tor.category, budgets);
  });

  return Array.from(budgetsByCategory.entries())
    .map(([category, budgets]) => ({
      category,
      department: "Multiple",
      year: new Date().getFullYear(),
      minThb: Math.min(...budgets),
      medianThb: median(budgets),
      maxThb: Math.max(...budgets),
      count: budgets.length,
    }))
    .sort((a, b) => b.medianThb - a.medianThb);
}

export function getBenchmarkForCategory(
  benchmarks: BudgetBenchmark[],
  category: string
): BudgetBenchmark | undefined {
  return benchmarks.find((item) => item.category === category);
}
