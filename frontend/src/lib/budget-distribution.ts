export interface BudgetBin {
  lower: number;
  upper: number;
  includesLower: boolean;
  includesUpper: boolean;
  count: number;
}

export const BUDGET_OVERFLOW_THRESHOLD = 10_000_000;

/** Up to seven quantile groups through ฿10M, plus a fixed open-ended last bin. */
export function buildBudgetDistribution(records: { id: string; budgetThb: unknown }[]): BudgetBin[] {
  const seen = new Set<string>();
  const budgets: number[] = [];
  for (const record of records) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    const raw = record.budgetThb;
    if (typeof raw !== "number" && typeof raw !== "string") continue;
    const budget = typeof raw === "string" ? Number(raw.trim()) : raw;
    if (!Number.isFinite(budget) || budget <= 0) continue;
    budgets.push(budget);
  }
  if (!budgets.length) return [];

  const lowerBudgets = budgets.filter((budget) => budget <= BUDGET_OVERFLOW_THRESHOLD).sort((a, b) => a - b);
  // Each gap separates two distinct values. Its rank is the number of records
  // below that gap, allowing quantile targets to respect repeated observations.
  const gaps: { boundary: number; rank: number }[] = [];
  for (let i = 1; i < lowerBudgets.length; i++) {
    const previous = lowerBudgets[i - 1];
    const next = lowerBudgets[i];
    if (previous === next) continue;
    const midpoint = previous + (next - previous) / 2;
    // If adjacent floating-point values have no representable midpoint, use
    // the upper observation. Never create a zero-width final range at ฿10M.
    const boundary = midpoint > previous ? midpoint : next;
    if (boundary < BUDGET_OVERFLOW_THRESHOLD) gaps.push({ boundary, rank: i });
  }
  const groupCount = Math.min(7, gaps.length + 1);
  const edges = [0];
  let previousGap = -1;
  for (let group = 1; group < groupCount; group++) {
    const targetRank = group * lowerBudgets.length / groupCount;
    // Reserve distinct gaps for the remaining groups. This keeps seven groups
    // when possible even when several percentile targets fall inside one tie.
    const lastGap = gaps.length - (groupCount - group);
    let best = previousGap + 1;
    for (let candidate = best + 1; candidate <= lastGap; candidate++) {
      if (Math.abs(gaps[candidate].rank - targetRank) < Math.abs(gaps[best].rank - targetRank)) best = candidate;
    }
    edges.push(gaps[best].boundary);
    previousGap = best;
  }
  edges.push(BUDGET_OVERFLOW_THRESHOLD);
  const bins: BudgetBin[] = edges.slice(0, -1).map((lower, i) => ({
    lower, upper: edges[i + 1], includesLower: i !== 0,
    includesUpper: i === edges.length - 2, count: 0,
  }));
  bins.push({ lower: BUDGET_OVERFLOW_THRESHOLD, upper: Infinity, includesLower: false, includesUpper: false, count: 0 });
  for (const budget of budgets) {
    const index = bins.findIndex((bin) => (bin.includesLower ? budget >= bin.lower : budget > bin.lower) &&
      (budget < bin.upper || (bin.includesUpper && budget <= bin.upper)));
    bins[index].count++;
  }
  return bins;
}

/** Add precision when nearby boundaries would otherwise share a rounded label. */
export function budgetBoundaryLabels(bins: BudgetBin[]): string[] {
  if (!bins.length) return [];
  const edges = [bins[0].lower, ...bins.map((bin) => bin.upper).filter(Number.isFinite)];
  const distinctEdges = new Set(edges).size;
  for (let precision = 3; precision <= 17; precision++) {
    const formatter = new Intl.NumberFormat("en", { notation: "compact", maximumSignificantDigits: precision });
    const labels = edges.map((edge) => `฿${formatter.format(edge)}`);
    if (new Set(labels).size === distinctEdges) return labels;
  }
  return edges.map((edge) => `฿${edge.toString()}`);
}
