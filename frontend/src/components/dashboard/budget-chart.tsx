"use client";

import { useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { formatBudget } from "@/data/mock";
import { cn } from "@/lib/utils";
import type { BudgetBenchmark } from "@/types/tor";

// A fixed tick count keeps each category chart aligned and avoids visual jitter.
const AXIS_TICKS = 4;

export function BudgetChart({ data }: { data: BudgetBenchmark[] }) {
  const { t } = useLocale();
  const [hovered, setHovered] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <p className="text-sm font-medium">{t("emptyBudgetData")}</p>
      </div>
    );
  }

  // Every bar uses one shared maximum so categories can be compared honestly.
  const maxMedian = Math.max(...data.map((item) => item.medianThb));

  const ticks = Array.from({ length: AXIS_TICKS + 1 }, (_, index) =>
    Math.round((maxMedian * index) / AXIS_TICKS)
  );

  return (
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
                    <div className="h-8 rounded-md bg-muted/80">
                      <div
                        className={cn(
                          "flex h-full items-center justify-end rounded-md border-0 px-2 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-1 ring-[color-mix(in_srgb,currentColor_32%,transparent)] backdrop-blur-md backdrop-saturate-150 transition-all duration-500",
                          active && "brightness-110"
                        )}
                        style={{
                          width: `${width}%`,
                          color: chartVar,
                          background: `color-mix(in srgb, ${chartVar} 36%, transparent)`,
                        }}
                      >
                        <span className="text-[0.65rem] font-semibold">
                          {formatBudget(item.medianThb)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "pointer-events-none absolute left-0 top-[calc(100%+0.35rem)] z-10 w-max max-w-[16rem] rounded-lg border-0 bg-[color-mix(in_srgb,var(--palette-gray-50)_62%,transparent)] px-2.5 py-2 text-xs text-popover-foreground shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150 transition-opacity",
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
  );
}
