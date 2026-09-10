"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { AgencyStrip } from "@/components/home/agency-strip";
import { KpiStrip } from "@/components/home/kpi-strip";
import { LatestPanel } from "@/components/home/latest-panel";
import { SuspiciousPanel } from "@/components/home/suspicious-panel";
import { HomeBand, HomeRule, HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { routes } from "@/config/routes";

export function MonitorHome() {
  const { t } = useLocale();

  return (
    <div>
      <HomeBand>
        <section className="space-y-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">
                <Badge className="h-auto px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]">
                  {t("monitorEyebrow")}
                </Badge>
              </p>
              <h1 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-[1.2]">
                {t("monitorTitle")}
              </h1>
              <p className="text-base leading-[1.7] text-muted-foreground">
                {t("monitorDescription")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button asChild variant="orange">
                <Link href={routes.tors}>
                  {t("browseTors")}
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={routes.dashboard}>{t("budgetDashboard")}</Link>
              </Button>
            </div>
          </div>

          <Surface className="space-y-5 bg-surface p-5 ring-transparent md:space-y-6 md:p-6">
            <KpiStrip />
            <div className="grid gap-5 lg:grid-cols-5 lg:items-start">
              <div className="lg:col-span-2">
                <SuspiciousPanel />
              </div>
              <div className="lg:col-span-3">
                <LatestPanel />
              </div>
            </div>
          </Surface>
        </section>
      </HomeBand>
      <HomeRule />
      <HomeBand>
        <HomeSection
          eyebrow={t("agenciesEyebrow")}
          title={t("agenciesTitle")}
          description={t("coverageHint")}
        >
          <AgencyStrip />
        </HomeSection>
      </HomeBand>
    </div>
  );
}
