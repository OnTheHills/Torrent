"use client";

import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";

import { BudgetChart } from "@/components/dashboard/budget-chart";
import { BudgetKpiStrip } from "@/components/dashboard/budget-kpi-strip";
import { DashboardFetchStatus } from "@/components/dashboard/dashboard-loading";
import { HistoricalPriceTable } from "@/components/dashboard/historical-price-table";
import { MonitorSection } from "@/components/monitor/monitor-section";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { fetchTorsForQuery } from "@/lib/api";
import { buildBudgetBenchmarks } from "@/lib/budget";

export function DashboardView() {
  const { t } = useLocale();
  const { data: tors = [], isFetching, isPending } = useQuery({
    queryKey: ["tors"],
    queryFn: fetchTorsForQuery,
    retry: 30,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
    refetchInterval: (query) =>
      Array.isArray(query.state.data) && query.state.data.length === 0
        ? 2_000
        : false,
  });

  const benchmarks = buildBudgetBenchmarks(tors);
  const sourceCount = new Set(tors.map((tor) => tor.sourceKind).filter(Boolean))
    .size;
  const draftCount = tors.filter((tor) => tor.lifecycle === "draft").length;
  const publishedCount = tors.filter(
    (tor) => tor.lifecycle === "published"
  ).length;
  const fundedTors = tors.filter((tor) => tor.budgetThb > 0);
  const waiting = isPending || (isFetching && tors.length === 0);

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(72px+4rem)] sm:px-6 md:pb-12 md:pt-[calc(72px+6rem)]">
          <div className="mt-2 w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hero-muted">
              {t("dashboardEyebrow")}
            </p>
            <h1 className="mt-4 whitespace-pre-line text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              {t("dashboardTitle")}
            </h1>
            <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
              {t("dashboardDescription")}
            </p>
          </div>
          <div className="mt-9 flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" variant="orange">
              <Link href={routes.tors}>
                {t("browseTors")}
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={routes.monitor}>{t("openMonitor")}</Link>
            </Button>
          </div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
        {isFetching ? <DashboardFetchStatus /> : null}

        <BudgetKpiStrip
          isPending={waiting}
          values={{
            kpiSources: sourceCount,
            statDraftLive: draftCount,
            statPublished: publishedCount,
          }}
        />

        <MonitorSection
          title={t("chartTitle")}
          description={t("chartDescription")}
          surfaceClassName="rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_62%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150"
        >
          {waiting ? (
            <div className="h-64 animate-pulse rounded-lg bg-background/60" />
          ) : (
            <BudgetChart data={benchmarks} />
          )}
        </MonitorSection>

        <MonitorSection
          title={t("historyTableTitle")}
          description={t("historyTableDescription")}
        >
          {waiting ? (
            <div className="h-80 animate-pulse rounded-lg bg-background/60" />
          ) : (
            <HistoricalPriceTable benchmarks={benchmarks} tors={fundedTors} />
          )}
        </MonitorSection>
      </div>
    </div>
  );
}
