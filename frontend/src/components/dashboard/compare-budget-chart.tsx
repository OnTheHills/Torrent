"use client";

import { useLocale } from "@/components/providers/locale-provider";
import {
  formatBudgetCompact,
  torTitle,
} from "@/data/mock";
import { getBenchmarkForCategory } from "@/lib/budget";
import { cn } from "@/lib/utils";
import type { BudgetBenchmark, Tor } from "@/types/tor";

export function CompareBudgetChart({
  benchmarks,
  tors,
}: {
  benchmarks: BudgetBenchmark[];
  tors: Tor[];
}) {
  const { locale, t } = useLocale();

  // A TOR can only be compared when its category has a benchmark.
  const rows = tors
    .map((tor) => {
      const benchmark = getBenchmarkForCategory(benchmarks, tor.category);
      if (!benchmark) return null;
      return { tor, median: benchmark.medianThb };
    })
    .filter((row): row is { tor: Tor; median: number } => row !== null);

  // Project and median bars share one scale within this chart.
  const max = Math.max(
    ...rows.flatMap((row) => [row.tor.budgetThb, row.median]),
    1
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {t("emptyBudgetData")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-primary" />
          {t("compareLegendProject")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-muted-foreground/50" />
          {t("compareLegendAverage")}
        </span>
      </div>

      <ul className="space-y-4">
        {rows.map(({ tor, median }) => {
          const projectPct = Math.max(4, Math.round((tor.budgetThb / max) * 100));
          const avgPct = Math.max(4, Math.round((median / max) * 100));
          const label = torTitle(tor, locale);

          return (
            <li key={tor.id} className="space-y-2">
              <p className="truncate text-sm font-medium" title={label}>
                {label}
              </p>
              <div className="grid gap-1.5">
                <div className="flex items-center gap-3">
                  <div className="h-7 flex-1 overflow-hidden rounded-md bg-muted/80">
                    <div
                      className={cn(
                        "flex h-full items-center justify-end rounded-md bg-primary px-2"
                      )}
                      style={{ width: `${projectPct}%` }}
                    >
                      <span className="text-[0.65rem] font-semibold text-primary-foreground">
                        {formatBudgetCompact(tor.budgetThb, locale)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-7 flex-1 overflow-hidden rounded-md bg-muted/80">
                    <div
                      className="flex h-full items-center justify-end rounded-md bg-muted-foreground/45 px-2"
                      style={{ width: `${avgPct}%` }}
                    >
                      <span className="text-[0.65rem] font-semibold text-background">
                        {formatBudgetCompact(median, locale)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
