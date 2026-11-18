"use client";

import { Pulse01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { HeroTitle } from "@/components/layout/hero-title";
import { ShellContent } from "@/components/layout/shell-content";
import { KpiStrip } from "@/components/monitor/kpi-strip";
import { LatestPanel } from "@/components/monitor/latest-panel";
import { MonitorHeroGraphic } from "@/components/monitor/monitor-hero-graphic";
import { SuspiciousPanel } from "@/components/monitor/suspicious-panel";
import { useLocale } from "@/components/providers/locale-provider";

export function MonitorHome() {
  const { t } = useLocale();

  return (
    <div>
      <section className="relative -mt-[144px] min-h-[24rem] overflow-hidden hero-atmosphere text-hero-foreground md:min-h-[28rem]">
        <MonitorHeroGraphic className="absolute inset-0 z-0 opacity-95" />
        <ShellContent>
          <div className="relative z-10 mx-auto flex min-h-[24rem] max-w-6xl flex-col justify-end px-4 pb-8 pt-[calc(144px+1.75rem)] sm:px-6 md:min-h-[28rem] md:pb-12 md:pt-[calc(144px+2.5rem)]">
            <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl">
              <HeroTitle
                preLine
                icon={<HugeiconsIcon icon={Pulse01Icon} strokeWidth={1.75} />}
              >
                {t("monitorTitle")}
              </HeroTitle>
              <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
                {t("monitorDescription")}
              </p>
            </div>
          </div>
        </ShellContent>
        <div aria-hidden className="relative z-10 h-px bg-border" />
      </section>

      <ShellContent>
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
          <KpiStrip />
          <SuspiciousPanel />
          <LatestPanel />
        </div>
      </ShellContent>
    </div>
  );
}
