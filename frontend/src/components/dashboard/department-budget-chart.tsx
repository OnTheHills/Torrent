"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { BudgetTip } from "@/components/dashboard/budget-chart";
import { ChartSkeleton } from "@/components/dashboard/dashboard-loading";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { fetchTopDepartmentsByBudget } from "@/lib/api";
import { cn } from "@/lib/utils";

export function DepartmentBudgetChart() {
  const { t, locale } = useLocale();
  const [hovered, setHovered] = useState<number | null>(null);
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

  if (isPending) return <ChartSkeleton label={t("departmentBudgetLoading")} variant="rows" />;
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
      <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden sm:block"
        style={{ left: "calc(12rem + 0.75rem)" }}
      >
        {[0.25, 0.5, 0.75].map((fraction) => (
          <span
            key={fraction}
            className="absolute inset-y-0 border-l border-dashed border-border/70"
            style={{ left: `${fraction * 100}%` }}
          />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <p className="text-xs text-muted-foreground">{t("departmentBudgetDepartment")}</p>
        <div aria-hidden className="hidden justify-between text-xs text-muted-foreground sm:flex">
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => <span key={fraction}>{compactBudget(maximum * fraction)}</span>)}
        </div>
      </div>
      <ol className="relative mt-3 space-y-3" aria-label={t("departmentBudgetTitle")}>
        {departments.map((item, index) => {
          const width = (item.totalBudget / maximum) * 100;
          const active = hovered === index;
          return (
            <li
              key={`${item.department}-${index}`}
              className="grid items-center gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-3"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              <p className="truncate text-sm font-medium" title={item.department}>{item.department}</p>
              <div
                className="relative"
                tabIndex={0}
                aria-label={`${item.department}: ${fullBudget(item.totalBudget)}, ${item.torCount} ${t("departmentBudgetRecords")}`}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
              >
                <GrayBar
                  label={`${compactBudget(item.totalBudget)} THB`}
                  width={width}
                  active={active}
                />
                <BudgetTip active={active}>
                  <p className="break-words font-medium">{item.department}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground marker:text-muted-foreground">
                    <li>{t("departmentBudgetTotal")}: {fullBudget(item.totalBudget)}</li>
                    <li>{item.torCount.toLocaleString(numberLocale)} {t("departmentBudgetRecords")}</li>
                  </ul>
                </BudgetTip>
              </div>
            </li>
          );
        })}
      </ol>
      </div>
      <p className="mt-5 text-center text-xs text-muted-foreground">{t("departmentBudgetAxis")}</p>
    </div>
  );
}

function GrayBar({
  label,
  width,
  active,
}: {
  label: string;
  width: number;
  active: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [outside, setOutside] = useState(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const labelEl = labelRef.current;
      if (!labelEl) return;
      const barWidth = (track.clientWidth * width) / 100;
      setOutside(labelEl.scrollWidth + 16 > barWidth);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [width, label]);

  return (
    <div ref={trackRef} className="flex h-8 min-w-0 items-center">
      <div
        data-budget-bar
        className={cn(
          "flex h-full min-w-0 shrink-0 items-center justify-end overflow-hidden rounded-sm px-2",
          active && "brightness-105",
        )}
        style={{
          width: `${width}%`,
          color: "var(--palette-gray-800)",
          background: "color-mix(in srgb, var(--palette-gray-300) 92%, transparent)",
          boxShadow: "var(--liquid-glass-edge)",
          WebkitBackdropFilter: "var(--liquid-glass-filter)",
          backdropFilter: "var(--liquid-glass-filter)",
        }}
      >
        {outside ? null : (
          <span ref={labelRef} className="shrink-0 whitespace-nowrap text-[0.65rem] font-semibold">
            {label}
          </span>
        )}
      </div>
      {outside ? (
        <span
          ref={labelRef}
          data-budget-label
          className="ml-2 shrink-0 whitespace-nowrap text-[0.65rem] font-semibold text-[var(--palette-gray-800)]"
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
