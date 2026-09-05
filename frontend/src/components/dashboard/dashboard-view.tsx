"use client";

import { BudgetChart } from "@/components/dashboard/budget-chart";
import { CompareBudgetChart } from "@/components/dashboard/compare-budget-chart";
import { HistoricalPriceTable } from "@/components/dashboard/historical-price-table";
import { PageHeader } from "@/components/layout/page-header";
import { useLocale } from "@/components/providers/locale-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildBudgetBenchmarks } from "@/lib/budget";
import { Tor } from "@/types/tor";

export function DashboardView({ tors }: { tors: Tor[] }) {
  const { t } = useLocale();
  // All dashboard sections share these category benchmarks, so calculate once
  // in the parent instead of allowing chart/table definitions to drift apart.
  const benchmarks = buildBudgetBenchmarks(tors);
  // A missing agencyId falls back to its department, which is common in imports.
  const agencyCount = new Set(
    tors
      .map((tor) => tor.agencyId || tor.department || tor.departmentTh)
      .filter(Boolean)
  ).size;

  const draftCount = tors.filter((tor) => tor.lifecycle === "draft").length;
  const publishedCount = tors.filter(
    (tor) => tor.lifecycle === "published"
  ).length;

  const stats = [
    { key: "kpiAgencies" as const, value: String(agencyCount) },
    { key: "statCategories" as const, value: String(benchmarks.length) },
    { key: "statDraftLive" as const, value: String(draftCount) },
    { key: "statPublished" as const, value: String(publishedCount) },
  ];

  // Keep the comparison chart scannable while the table below remains complete.
  const compareRows = tors.filter((tor) => tor.lifecycle !== "awarded").slice(
    0,
    8
  );

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
      <PageHeader
        eyebrow={t("dashboardEyebrow")}
        title={t("dashboardTitle")}
        description={t("dashboardDescription")}
      />

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.key} size="sm">
            <CardHeader className="gap-2">
              <CardDescription className="text-xs uppercase tracking-[0.14em]">
                {t(stat.key)}
              </CardDescription>
              <CardTitle className="text-3xl font-semibold tracking-tight">
                {stat.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-2 border-b border-border pb-5">
          <CardTitle className="text-lg md:text-xl">{t("chartTitle")}</CardTitle>
          <CardDescription className="text-sm md:text-base">
            {t("chartDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <BudgetChart data={benchmarks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2 border-b border-border pb-5">
          <CardTitle className="text-lg md:text-xl">
            {t("compareChartTitle")}
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
            {t("compareChartDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CompareBudgetChart benchmarks={benchmarks} tors={compareRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2 border-b border-border pb-5">
          <CardTitle className="text-lg md:text-xl">{t("historyTableTitle")}</CardTitle>
          <CardDescription className="text-sm md:text-base">
            {t("historyTableDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <HistoricalPriceTable benchmarks={benchmarks} tors={tors} />
        </CardContent>
      </Card>
    </div>
  );
}
