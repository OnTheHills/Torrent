"use client";

import { useId } from "react";
import { useQuery } from "@tanstack/react-query";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { fetchTopDepartmentsByBudget } from "@/lib/api";

export function DepartmentBudgetChart() {
  const { t, locale } = useLocale();
  const tooltipPrefix = useId();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["tors", "top-departments-by-budget"],
    queryFn: fetchTopDepartmentsByBudget,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const numberLocale = locale === "th" ? "th-TH" : "en-GB";
  const fullBudget = (value: number) => `${value.toLocaleString(numberLocale, { maximumFractionDigits: 2 })} THB`;
  // Use K/M/B consistently in both dashboard languages, with the unit explicit.
  const compactBudget = (value: number) => new Intl.NumberFormat("en", {
    notation: "compact", maximumFractionDigits: 1,
  }).format(value);

  if (isPending) return <div role="status" aria-label={t("departmentBudgetLoading")} className="h-96 animate-pulse rounded-lg bg-background/60" />;
  if (isError && !data) return (
    <div role="alert" className="space-y-3 py-16 text-center text-sm">
      <p>{t("departmentBudgetError")}</p>
      <Button variant="outline" onClick={() => void refetch()}>{t("departmentBudgetRetry")}</Button>
    </div>
  );
  const departments = [...(data?.departments ?? [])].sort((a, b) =>
    b.totalBudget - a.totalBudget || b.torCount - a.torCount || a.department.localeCompare(b.department)
  );
  if (!departments.length) return <p className="py-16 text-center text-sm text-muted-foreground">{t("departmentBudgetEmpty")}</p>;
  const maximum = departments[0].totalBudget;

  return (
    <div>
      {isError ? <p role="status" className="mb-3 text-sm text-muted-foreground">{t("departmentBudgetStale")}</p> : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <p className="text-xs text-muted-foreground">{t("departmentBudgetDepartment")}</p>
        <div aria-hidden className="hidden justify-between text-xs text-muted-foreground sm:flex">
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => <span key={fraction}>{compactBudget(maximum * fraction)}</span>)}
        </div>
      </div>
      <ol className="mt-3 space-y-3" aria-label={t("departmentBudgetTitle")}>
        {departments.map((item, index) => (
          <li key={`${item.department}-${index}`} className="group relative grid items-center gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-3">
            <p className="truncate text-sm font-medium" title={item.department}>{item.department}</p>
            <div tabIndex={0} aria-describedby={`${tooltipPrefix}-${index}`}
              aria-label={`${item.department}: ${fullBudget(item.totalBudget)}, ${item.torCount} ${t("departmentBudgetRecords")}`}
              className="relative rounded-md outline-offset-4">
              <div className="relative h-9 overflow-hidden rounded-md bg-muted/70">
                {[0.25, 0.5, 0.75].map((fraction) => <span key={fraction} aria-hidden className="absolute inset-y-0 border-l border-dashed border-border" style={{ left: `${fraction * 100}%` }} />)}
                <div className="relative h-full rounded-md bg-violet-500/70 ring-1 ring-inset ring-violet-500/40 transition-[width] duration-500" style={{ width: `${item.totalBudget / maximum * 100}%` }} />
                <span className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-foreground">{compactBudget(item.totalBudget)} THB</span>
              </div>
              <div id={`${tooltipPrefix}-${index}`} role="tooltip"
                className="pointer-events-none absolute right-0 top-full z-20 mt-1 w-max max-w-[min(24rem,80vw)] rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <p className="break-words font-medium">{item.department}</p>
                <p className="mt-1">{t("departmentBudgetTotal")}: {fullBudget(item.totalBudget)}</p>
                <p>{item.torCount.toLocaleString(numberLocale)} {t("departmentBudgetRecords")}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-center text-xs text-muted-foreground">{t("departmentBudgetAxis")}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("departmentBudgetNote")}</p>
    </div>
  );
}
