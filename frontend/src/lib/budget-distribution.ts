export interface BudgetBin {
  lower: number;
  upper: number;
  includesLower: boolean;
  includesUpper: boolean;
  count: number;
}

export const BUDGET_OVERFLOW_THRESHOLD = 10_000_000;

/** Round bands a reader can compare, ending in an open group above ฿10M. */
const BAND_EDGES = [0, 10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000, BUDGET_OVERFLOW_THRESHOLD];

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

  const bins: BudgetBin[] = BAND_EDGES.slice(0, -1).map((lower, i) => ({
    lower,
    upper: BAND_EDGES[i + 1],
    includesLower: i !== 0,
    includesUpper: i === BAND_EDGES.length - 2,
    count: 0,
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
