"use client";

import { useQuery } from "@tanstack/react-query";

import { ChartSkeleton } from "@/components/dashboard/dashboard-loading";
import { useLocale } from "@/components/providers/locale-provider";
import { categoryGlass } from "@/components/tor/listing-badges";
import { Button } from "@/components/ui/button";
import { fetchCategoryDistribution } from "@/lib/api";

export function CategoryDistributionChart() {
  const { t, locale } = useLocale();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["tors", "category-distribution"],
    queryFn: fetchCategoryDistribution,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  // The API supplies final counts and order, including the last Others bar.
  const categories = data?.categories ?? [];
  const formatCount = (count: number) => count.toLocaleString(locale === "th" ? "th-TH" : "en-GB");

  if (isPending) return <ChartSkeleton label={t("categoryDistributionLoading")} />;
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
              {categories.map((item) => (
                <li key={item.category} className="relative flex h-full items-end">
                  <div
                    data-category-bar={item.category}
                    data-frequency={item.frequency}
                    className="relative w-full rounded-t-sm transition-[height] duration-500"
                    style={{
                      height: `${item.frequency / yMax * 100}%`,
                      background: `linear-gradient(180deg, rgb(255 255 255 / 0.5), rgb(255 255 255 / 0.06) 38%, transparent 70%), color-mix(in srgb, ${categoryGlass(item.category).fill} 82%, transparent)`,
                      boxShadow: "var(--liquid-glass-edge)",
                      WebkitBackdropFilter: "var(--liquid-glass-filter)",
                      backdropFilter: "var(--liquid-glass-filter)",
                    }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-[var(--palette-gray-800)]">{formatCount(item.frequency)}</span>
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
