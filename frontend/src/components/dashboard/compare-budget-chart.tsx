"use client";

import { useLocale } from "@/components/providers/locale-provider";
import {
  formatBudgetCompact,
  getBenchmarkForCategory,
  torTitle,
} from "@/data/mock";
import { cn } from "@/lib/utils";
import type { Tor } from "@/types/tor";

export function CompareBudgetChart({ tors }: { tors: Tor[] }) {
  const { locale, t } = useLocale();

  const rows = tors
    .map((tor) => {
      const benchmark = getBenchmarkForCategory(tor.category);
      if (!benchmark) return null;
      return { tor, median: benchmark.medianThb };
    })
    .filter((row): row is { tor: Tor; median: number } => row !== null);

  const max = Math.max(
    ...rows.flatMap((row) => [row.tor.budgetThb, row.median]),
    1
  );

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
