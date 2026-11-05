export interface BudgetBin {
  lower: number;
  upper: number;
  includesUpper: boolean;
  count: number;
}

/** Exactly six equal-width bins over positive finite budgets; no input mutation. */
export function buildBudgetDistribution(records: { id: string; budgetThb: unknown }[]): BudgetBin[] {
  const seen = new Set<string>();
  const budgets: number[] = [];
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const record of records) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    const raw = record.budgetThb;
    if (typeof raw !== "number" && typeof raw !== "string") continue;
    const budget = typeof raw === "string" ? Number(raw.trim()) : raw;
    if (!Number.isFinite(budget) || budget <= 0) continue;
    budgets.push(budget);
    minimum = Math.min(minimum, budget);
    maximum = Math.max(maximum, budget);
  }
  if (!budgets.length) return [];

  // Equal values have no natural width. Extend downwards rather than inventing
  // a maximum above the observed one; every value belongs to the final bin.
  const lower = minimum === maximum ? minimum / 2 : minimum;
  const span = maximum - lower;
  const edges = Array.from({ length: 7 }, (_, i) => i === 6 ? maximum : lower + span * (i / 6));
  const bins: BudgetBin[] = Array.from({ length: 6 }, (_, i) => ({
    lower: edges[i], upper: edges[i + 1], includesUpper: i === 5, count: 0,
  }));
  for (const budget of budgets) {
    // Compare against the same boundaries used by labels/tooltips. Division and
    // floor alone can put an exact decimal boundary into the preceding bin.
    const index = bins.findIndex((bin) => budget >= bin.lower &&
      (budget < bin.upper || (bin.includesUpper && budget <= bin.upper)));
    bins[index].count++;
  }
  return bins;
}

/** Add precision when nearby boundaries would otherwise share a rounded label. */
export function budgetBoundaryLabels(bins: BudgetBin[]): string[] {
  if (!bins.length) return [];
  const edges = [bins[0].lower, ...bins.map((bin) => bin.upper)];
  const distinctEdges = new Set(edges).size;
  for (let precision = 3; precision <= 17; precision++) {
    const formatter = new Intl.NumberFormat("en", { notation: "compact", maximumSignificantDigits: precision });
    const labels = edges.map((edge) => `฿${formatter.format(edge)}`);
    if (new Set(labels).size === distinctEdges) return labels;
  }
  return edges.map((edge) => `฿${edge.toString()}`);
}
