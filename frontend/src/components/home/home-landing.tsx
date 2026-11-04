"use client";

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
          className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,transparent_40%,var(--hero-stripe-c)_100%)]"
        />
        <HomeFrame className="relative z-10 flex min-h-[28rem] flex-col justify-end pb-8 pt-[calc(144px+1.5rem)] md:min-h-[32rem] md:pb-10 md:pt-[calc(144px+2rem)]">
          <div className="max-w-2xl md:max-w-3xl">
            <BrandLockup size="xxxxl" priority />
            <h1 className="mt-2 whitespace-pre-line text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              {t("homeTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-[1.7] text-hero-muted md:text-lg">
              {t("homeDescription")}
            </p>
          </div>
          <HomeHeroCards className="mt-8 w-full" />
        </HomeFrame>
      </section>

      <HomeBand>
        <div className="pt-8 md:pt-2">
          <HomeCoverage />
        </div>
      </HomeBand>
      <HomeBand>
        <HomeRoles />
      </HomeBand>
      <HomeBand>
        <HomeWorkflow />
      </HomeBand>
    </div>
  );
}
