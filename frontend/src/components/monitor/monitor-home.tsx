"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { KpiStrip } from "@/components/monitor/kpi-strip";
import { LatestPanel } from "@/components/monitor/latest-panel";
import { SuspiciousPanel } from "@/components/monitor/suspicious-panel";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export function MonitorHome() {
  const { t } = useLocale();

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(72px+4rem)] sm:px-6 md:pb-12 md:pt-[calc(72px+6rem)]">
          <div className="mt-2 w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hero-muted">
              {t("monitorEyebrow")}
            </p>
            <h1 className="mt-4 whitespace-pre-line text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              {t("monitorTitle")}
            </h1>
            <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
              {t("monitorDescription")}
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
              <Link href={routes.dashboard}>{t("budgetDashboard")}</Link>
            </Button>
          </div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
        <KpiStrip />
        <SuspiciousPanel />
        <LatestPanel />
      </div>
    </div>
  );
}
