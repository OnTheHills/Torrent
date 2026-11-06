"use client";

import { HomeAlerts } from "@/components/home/home-alerts";
import { HomeCoverage } from "@/components/home/home-coverage";
import { HomeHeroCards } from "@/components/home/home-hero-cards";
import { HomeHeroTiles } from "@/components/home/home-hero-tiles";
import { HomeRoles } from "@/components/home/home-roles";
import { HomeBand, HomeFrame } from "@/components/home/home-section";
import { HomeWorkflow } from "@/components/home/home-workflow";
import { BrandLockup } from "@/components/layout/brand-lockup";
import { useLocale } from "@/components/providers/locale-provider";

export function HomeLanding() {
  const { t } = useLocale();

  return (
    <div>
      <section className="relative -mt-[144px] min-h-[28rem] overflow-hidden hero-atmosphere text-hero-foreground md:min-h-[32rem]">
        {/* Full-bleed integrity mosaic — teal clear, orange flagged. */}
        <HomeHeroTiles className="pointer-events-none absolute inset-0 z-0 opacity-95" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[min(70%,22rem)] bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--background)_40%,transparent)_42%,var(--background)_88%,var(--background)_100%)]"
        />
        <HomeFrame className="relative z-10 flex min-h-[28rem] flex-col justify-end pb-8 pt-[calc(144px+1.5rem)] md:min-h-[32rem] md:pb-10 md:pt-[calc(144px+2rem)]">
          <div className="max-w-3xl md:max-w-5xl">
            <BrandLockup size="xxxxl" priority />
            <h1 className="mt-0.5 whitespace-pre-line text-3xl font-semibold tracking-tight md:mt-1 md:text-5xl md:leading-[1.1]">
              {t("homeTitle")}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-[1.7] text-hero-muted md:max-w-4xl md:text-lg">
              {t("homeDescription")}
            </p>
          </div>
          <HomeHeroCards className="mt-8 w-full" />
        </HomeFrame>
      </section>

      <HomeBand frameClassName="pt-4 md:pt-6">
        <HomeCoverage />
      </HomeBand>
      <HomeBand>
        <HomeWorkflow />
      </HomeBand>
      <HomeBand>
        <HomeRoles />
      </HomeBand>
      <HomeBand frameClassName="pt-3 pb-12 md:pt-4 md:pb-16">
        <HomeAlerts />
      </HomeBand>
    </div>
  );
}
