"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { HomeCapabilities } from "@/components/home/home-capabilities";
import { HomeCoverage } from "@/components/home/home-coverage";
import { HomeCta } from "@/components/home/home-cta";
import { HomeRoles } from "@/components/home/home-roles";
import { HomeBand, HomeFrame, HomeRule } from "@/components/home/home-section";
import { HomeTrust } from "@/components/home/home-trust";
import { HomeWorkflow } from "@/components/home/home-workflow";
import { BrandLockup } from "@/components/layout/brand-lockup";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

const frostButton =
  "border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]";

const frostTealButton =
  "border-0 bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] text-[var(--palette-teal-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[color-mix(in_srgb,var(--palette-teal-400)_44%,transparent)]";

export function HomeLanding() {
  const { t } = useLocale();

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <HomeFrame className="relative pb-8 pt-[calc(72px+4rem)] md:pb-12 md:pt-[calc(72px+6rem)]">
          <BrandLockup size="xxxxl" priority />
          <p className="mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hero-muted">
            {t("homeEyebrow")}
          </p>
          <h1 className="mt-4 whitespace-pre-line text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
            {t("homeTitle")}
          </h1>
          <div className="mt-8 grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
            <p className="text-base leading-[1.7] text-hero-muted md:text-lg">
              {t("homeDescription")}
            </p>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button asChild size="lg" className={frostTealButton}>
                <Link href={routes.tors}>
                  {t("browseTors")}
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                </Link>
              </Button>
              <Button asChild size="lg" className={frostButton}>
                <Link href={routes.monitor}>{t("openMonitor")}</Link>
              </Button>
            </div>
          </div>
        </HomeFrame>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <HomeBand>
      <div className="pt-8 md:pt-2">
        <HomeCoverage />
      </div>
      </HomeBand>
      <HomeRule />
      <HomeBand>
        <HomeCapabilities />
      </HomeBand>
      <HomeRule />
      <HomeBand>
        <HomeRoles />
      </HomeBand>
      <HomeRule />
      <HomeBand>
        <HomeWorkflow />
      </HomeBand>
      <HomeRule />
      <HomeBand>
        <HomeTrust />
      </HomeBand>
      <HomeRule />
      <HomeBand>
        <HomeCta />
      </HomeBand>
    </div>
  );
}
