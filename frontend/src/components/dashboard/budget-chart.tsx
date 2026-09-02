"use client";

import { useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { formatBudget } from "@/data/mock";
import { cn } from "@/lib/utils";
import type { BudgetBenchmark } from "@/types/tor";

const AXIS_TICKS = 4;

export function BudgetChart({ data }: { data: BudgetBenchmark[] }) {
  const { t } = useLocale();
  const [hovered, setHovered] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {t("emptyBudgetData")}
      </div>
    );
  }

  const maxMedian = Math.max(...data.map((item) => item.medianThb));

  const ticks = Array.from({ length: AXIS_TICKS + 1 }, (_, index) =>
    Math.round((maxMedian * index) / AXIS_TICKS)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-chart-1" />
          {t("chartLegendMedian")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-muted ring-1 ring-border" />
          {t("chartLegendScale")}
        </span>
        <span>{t("chartMeta")}</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between px-[7.5rem] text-[0.65rem] tabular-nums text-muted-foreground max-sm:hidden">
          {ticks.map((tick) => (
            <span key={tick}>{formatBudget(tick)}</span>
          ))}
        </div>
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-[7.5rem] right-0 max-sm:left-0"
          >
            {ticks.map((tick, index) => (
              <div
                key={tick}
                className="absolute top-0 bottom-0 border-l border-dashed border-border/70"
                style={{ left: `${(index / AXIS_TICKS) * 100}%` }}
              />
            ))}
          </div>

          <ul className="relative space-y-3">
            {data.map((item, index) => {
              const width = Math.max(
                4,
                Math.round((item.medianThb / maxMedian) * 100)
              );
              const chartVar = `var(--chart-${(index % 5) + 1})`;
              const active = hovered === item.category;

              return (
                <li
                  key={item.category}
                  className="group grid items-center gap-3 sm:grid-cols-[7.5rem_1fr]"
                  onMouseEnter={() => setHovered(item.category)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <p className="break-words text-sm font-medium leading-snug text-foreground">
                    {item.category}
                  </p>
                  <div className="relative">
                    <div className="h-8 overflow-hidden rounded-md bg-muted/80">
                      <div
                        className={cn(
                          "flex h-full items-center justify-end rounded-md px-2 transition-all duration-500",
                          active && "brightness-110"
                        )}
                        style={{
                          width: `${width}%`,
                          background: chartVar,
                        }}
                      >
                        <span className="text-[0.65rem] font-semibold text-primary-foreground drop-shadow-sm">
                          {formatBudget(item.medianThb)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "pointer-events-none absolute left-0 top-[calc(100%+0.35rem)] z-10 w-max max-w-[16rem] rounded-md border border-border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-md transition-opacity",
                        active ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <p className="font-medium">{item.category}</p>
                      <p className="mt-1 text-muted-foreground">
                        {t("chartMedian")} {formatBudget(item.medianThb)} ·{" "}
                        {t("chartRange")} {formatBudget(item.minThb)} –{" "}
                        {formatBudget(item.maxThb)}
                      </p>
                      <p className="text-muted-foreground">
                        {item.count} {t("chartSample")}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="pt-2 text-[0.65rem] text-muted-foreground sm:pl-[7.5rem]">
          {t("chartAxisNote")}
        </p>
      </div>
    </div>
  );
}
