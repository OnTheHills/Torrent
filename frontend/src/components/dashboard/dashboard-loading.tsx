"use client";

import { BudgetHero } from "@/components/dashboard/budget-hero";
import { BudgetKpiStrip } from "@/components/dashboard/budget-kpi-strip";
import { ShellContent } from "@/components/layout/shell-content";
import { MonitorSection } from "@/components/monitor/monitor-section";
import { useLocale } from "@/components/providers/locale-provider";
import { Skeleton } from "@/components/ui/skeleton";

const glassPanel =
  "liquid-glass-card liquid-glass-card-static liquid-glass-card-clear rounded-2xl p-5 md:p-6";

export function ChartSkeleton({
  label,
  variant = "columns",
}: {
  label: string;
  variant?: "columns" | "rows";
}) {
  return (
    <div role="status" aria-label={label} className="motion-reduce:[&_*]:animate-none">
      {variant === "columns" ? (
        <div className="flex h-64 items-end gap-3">
          {[46, 88, 34, 62, 22, 48, 28, 18].map((height) => (
            <Skeleton key={height} className="min-w-0 flex-1 rounded-t-sm" style={{ height: `${height}%` }} />
          ))}
        </div>
      ) : (
        <div className="space-y-3 py-2">
          {[92, 78, 70, 58, 49, 41].map((width) => (
            <Skeleton key={width} className="h-8 rounded-sm" style={{ width: `${width}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardLoading() {
  const { t } = useLocale();
  const charts = [
    ["chartTitle", "chartDescription", "columns"],
    ["ingestionTitle", "ingestionDescription", "rows"],
    ["departmentBudgetTitle", "departmentBudgetDescription", "rows"],
    ["distributionTitle", "distributionDescription", "columns"],
    ["categoryDistributionTitle", "categoryDistributionDescription", "columns"],
  ] as const;

  return (
    <div aria-busy="true">
      <BudgetHero />

      <ShellContent>
        <div className="mx-auto max-w-6xl space-y-10 px-4 pb-12 pt-4 sm:px-6 md:space-y-12 md:pb-16 md:pt-6">
          <BudgetKpiStrip
            isPending
            values={{
              medianBudget: 0,
              advertisedTotal: 0,
              publishedCount: 0,
              publishedSince: "",
            }}
          />
          {charts.map(([title, description, variant]) => (
            <MonitorSection key={title} title={t(title)} description={t(description)} bare>
              <div className={glassPanel}>
                <ChartSkeleton label={t(title)} variant={variant} />
              </div>
            </MonitorSection>
          ))}
        </div>
      </ShellContent>
    </div>
  );
}
