"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { BudgetChart } from "@/components/dashboard/budget-chart";
import { BudgetHero } from "@/components/dashboard/budget-hero";
import { BudgetKpiStrip } from "@/components/dashboard/budget-kpi-strip";
import { ChartSkeleton } from "@/components/dashboard/dashboard-loading";
import { TorIngestionChart } from "@/components/dashboard/tor-ingestion-chart";
import { DepartmentBudgetChart } from "@/components/dashboard/department-budget-chart";
import { BudgetDistributionChart } from "@/components/dashboard/budget-distribution-chart";
import { CategoryDistributionChart } from "@/components/dashboard/category-distribution-chart";
import { ShellContent } from "@/components/layout/shell-content";
import { MonitorSection } from "@/components/monitor/monitor-section";
import { useLocale } from "@/components/providers/locale-provider";
import { torsQueryOptions } from "@/lib/tors-query";
import { buildBudgetBenchmarks } from "@/lib/budget";

function DashboardPanel({ children }: { children: ReactNode }) {
  return (
    <div className="liquid-glass-card liquid-glass-card-static liquid-glass-card-clear rounded-2xl p-5 md:p-6">
      {children}
    </div>
  );
}

export function DashboardView() {
  const { t } = useLocale();
  const { data: tors = [], isFetching, isPending, isError } = useQuery(torsQueryOptions);

  const benchmarks = buildBudgetBenchmarks(tors);
  const fundedTors = tors.filter((tor) => tor.budgetThb > 0);
  const published = tors.filter((tor) => tor.lifecycle === "published");
  // Snapshot cards use published listings only. Awarded rows carry much smaller
  // award amounts and would drag the median down.
  const publishedPriced = fundedTors.filter(
    (tor) => tor.lifecycle === "published",
  );
  const publishedBudgets = publishedPriced
    .map((tor) => tor.budgetThb)
    .sort((a, b) => a - b);
  const midpoint = Math.floor(publishedBudgets.length / 2);
  const medianBudget =
    publishedBudgets.length === 0
      ? 0
      : publishedBudgets.length % 2 === 0
        ? Math.round(
            (publishedBudgets[midpoint - 1] + publishedBudgets[midpoint]) / 2,
          )
        : publishedBudgets[midpoint];
  const advertisedTotal = publishedPriced.reduce(
    (sum, tor) => sum + tor.budgetThb,
    0,
  );
  const publishedSince = published.reduce((earliest, tor) => {
    if (!tor.publishedAt) return earliest;
    return !earliest || tor.publishedAt < earliest ? tor.publishedAt : earliest;
  }, "");
  const waiting = isPending || (isFetching && tors.length === 0);

  return (
    <div>
      <BudgetHero />

      <ShellContent>
      <div className="mx-auto max-w-6xl space-y-10 px-4 pb-12 pt-4 sm:px-6 md:space-y-12 md:pb-16 md:pt-6">
        <BudgetKpiStrip
          isPending={waiting}
          values={{
            medianBudget,
            advertisedTotal,
            publishedCount: published.length,
            publishedSince,
          }}
        />

        <MonitorSection
          title={t("chartTitle")}
          description={t("chartDescription")}
          bare
        >
          <DashboardPanel>
            {waiting ? (
              <ChartSkeleton label={t("chartTitle")} variant="rows" />
            ) : (
              <BudgetChart data={benchmarks} />
            )}
          </DashboardPanel>
        </MonitorSection>

        <MonitorSection title={t("ingestionTitle")} description={t("ingestionDescription")} bare>
          <DashboardPanel>
            {waiting ? (
              <ChartSkeleton label={t("ingestionTitle")} variant="rows" />
            ) : isError && !tors.length ? (
              <p role="alert" className="py-16 text-center text-sm text-muted-foreground">{t("ingestionError")}</p>
            ) : (
              <>
                {isError ? <p role="status" className="mb-3 text-sm text-muted-foreground">{t("ingestionStale")}</p> : null}
                <TorIngestionChart tors={tors} />
              </>
            )}
          </DashboardPanel>
        </MonitorSection>

        <MonitorSection title={t("departmentBudgetTitle")} description={t("departmentBudgetDescription")} bare>
          <DashboardPanel>
            <DepartmentBudgetChart />
          </DashboardPanel>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {t("departmentBudgetNote")}
          </p>
        </MonitorSection>

        <MonitorSection title={t("distributionTitle")} description={t("distributionDescription")} bare>
          <DashboardPanel>
            <BudgetDistributionChart tors={tors} isPending={waiting} isError={isError} />
          </DashboardPanel>
        </MonitorSection>

        <MonitorSection title={t("categoryDistributionTitle")} description={t("categoryDistributionDescription")} bare>
          <DashboardPanel>
            <CategoryDistributionChart />
          </DashboardPanel>
        </MonitorSection>
      </div>
      </ShellContent>
    </div>
  );
}
