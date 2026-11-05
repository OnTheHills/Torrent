"use client";

import { useId } from "react";
import { useQuery } from "@tanstack/react-query";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { fetchCategoryDistribution } from "@/lib/api";

export function CategoryDistributionChart() {
  const { t, locale } = useLocale();
  const tooltipPrefix = useId();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["tors", "category-distribution"],
    queryFn: fetchCategoryDistribution,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  // The API supplies final counts and order, including the last Others bar.
  const categories = data?.categories ?? [];
  const formatCount = (count: number) => count.toLocaleString(locale === "th" ? "th-TH" : "en-GB");

  if (isPending) return <div role="status" aria-label={t("categoryDistributionLoading")} className="h-80 animate-pulse rounded-lg bg-background/60" />;
  if (isError && !data) return (
    <div role="alert" className="space-y-3 py-16 text-center text-sm">
      <p>{t("categoryDistributionError")}</p>
      <Button variant="outline" onClick={() => void refetch()}>{t("departmentBudgetRetry")}</Button>
    </div>
  );
  if (!categories.length) return <p className="py-16 text-center text-sm text-muted-foreground">{t("categoryDistributionEmpty")}</p>;
  // Only calculate the chart scale; category frequencies stay untouched.
  const step = Math.max(1, Math.ceil(Math.max(...categories.map((item) => item.frequency)) / 4));
  const yMax = step * 4;
  const columns = { gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` };

  return (
    <div>
      {isError ? <p role="status" className="mb-3 text-sm text-muted-foreground">{t("categoryDistributionStale")}</p> : null}
      <p className="mb-2 text-xs text-muted-foreground">{t("distributionCount")}</p>
      {/* Keep above-bar counts and the top axis tick inside the scroll viewport. */}
      <div className="overflow-x-auto pb-2 pt-8">
        <div className="grid min-w-[640px] grid-cols-[3rem_1fr] gap-x-3">
          <div aria-hidden className="relative h-64 text-right text-xs text-muted-foreground">
            {Array.from({ length: 5 }, (_, i) => i * step).map((count) => (
              <span key={count} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - count / yMax * 100}%` }}>{formatCount(count)}</span>
            ))}
          </div>
          <div className="relative h-64 border-b border-border">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              {Array.from({ length: 5 }, (_, i) => <div key={i} className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${i * 25}%` }} />)}
            </div>
            <ol className="relative grid h-full gap-2" style={columns} aria-label={t("categoryDistributionTitle")}>
              {categories.map((item, index) => (
                <li key={item.category} className="group relative flex h-full items-end">
                  <div tabIndex={0} role="group" aria-describedby={`${tooltipPrefix}-${index}`}
                    aria-label={`${item.category}: ${formatCount(item.frequency)} ${t("departmentBudgetRecords")}`}
                    className="absolute inset-0 z-10 rounded-sm outline-offset-2" />
                  <div data-category-bar={item.category} data-frequency={item.frequency}
                    className="relative w-full rounded-t-sm bg-teal-500/70 ring-1 ring-inset ring-teal-500/30 transition-[height] duration-500 group-hover:bg-teal-500/90 group-focus-within:bg-teal-500/90"
                    style={{ height: `${item.frequency / yMax * 100}%` }}>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium">{formatCount(item.frequency)}</span>
                  </div>
                  <div id={`${tooltipPrefix}-${index}`} role="tooltip"
                    className={`pointer-events-none absolute top-1 z-20 w-max max-w-[min(20rem,75vw)] rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-md group-hover:opacity-100 group-focus-within:opacity-100 ${index < categories.length / 2 ? "left-0" : "right-0"}`}>
                    <p className="break-words font-medium">{item.category}</p>
                    <p className="mt-1">{t("distributionCount")}: {formatCount(item.frequency)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div />
          <div className="mt-3 grid gap-2 text-center text-xs leading-relaxed text-muted-foreground" style={columns}>
            {categories.map((item) => <p key={item.category} className="break-words">{item.category}</p>)}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">{t("categoryDistributionAxis")}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("categoryDistributionNote")}</p>
    </div>
  );
}
