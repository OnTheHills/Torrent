"use client";

import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { BudgetKpiStrip } from "@/components/dashboard/budget-kpi-strip";
import { MonitorSection } from "@/components/monitor/monitor-section";
import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export function DashboardFetchStatus() {
  const { locale } = useLocale();

  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <span
        aria-hidden="true"
        className="size-4 rounded-full border-2 border-primary/25 border-t-primary motion-safe:animate-spin"
      />
      {locale === "th" ? "กำลังโหลดข้อมูลแดชบอร์ด…" : "Loading dashboard data…"}
    </p>
  );
}

export function DashboardLoading() {
  const { t } = useLocale();
  const vendor = useAudience() === "vendor";

  return (
    <div aria-busy="true">
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(144px+2rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3rem)]">
          <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <h1 className="whitespace-pre-line text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              {t("dashboardTitle")}
            </h1>
            <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
              {t("dashboardDescription")}
            </p>
          </div>
          <div className="mt-9 flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" variant="orange">
              <Link href={vendor ? routes.app.tors : routes.tors}>
                {t("browseTors")}
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Link>
            </Button>
            {vendor ? null : (
              <Button asChild size="lg" variant="outline">
                <Link href={routes.monitor}>{t("openMonitor")}</Link>
              </Button>
            )}
          </div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
        <DashboardFetchStatus />
        <div className="motion-reduce:[&_*]:animate-none">
          <BudgetKpiStrip
            isPending
            values={{
              kpiSources: 0,
              statDraftLive: 0,
              statPublished: 0,
            }}
          />
        </div>
        {(["chartTitle", "historyTableTitle"] as const).map(
          (title) => (
            <MonitorSection
              key={title}
              title={t(title)}
              description={
                title === "chartTitle"
                  ? t("chartDescription")
                  : t("historyTableDescription")
              }
            >
              <div className="h-64 animate-pulse rounded-lg bg-background/60" />
            </MonitorSection>
          )
        )}
      </div>
    </div>
  );
}
