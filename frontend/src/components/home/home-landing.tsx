"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { HomeCapabilities } from "@/components/home/home-capabilities";
import { HomeCoverage } from "@/components/home/home-coverage";
import { HomeCta } from "@/components/home/home-cta";
import { HomeRoles } from "@/components/home/home-roles";
import { HomeBand } from "@/components/home/home-section";
import { HomeTrust } from "@/components/home/home-trust";
import { HomeWorkflow } from "@/components/home/home-workflow";
import { BrandLockup } from "@/components/layout/brand-lockup";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { AGENCIES } from "@/config/agencies";
import { routes } from "@/config/routes";

export function HomeLanding() {
  const { t } = useLocale();

  const sourceCount = new Set(
    AGENCIES.flatMap((agency) => agency.sources.map((source) => source.kind))
  ).size;

  const stats = [
    { value: String(AGENCIES.length), label: t("heroStatOrganizations") },
    { value: String(sourceCount), label: t("heroStatSources") },
    { value: t("heroStatAccessValue"), label: t("heroStatAccess") },
  ];

  return (
    <div>
      <section className="relative overflow-hidden hero-atmosphere text-hero-foreground">
        <div className="pointer-events-none absolute inset-0 hero-rays opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <BrandLockup size="lg" priority />

          <p className="mt-10 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--palette-teal-200)]">
            {t("homeEyebrow")}
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
            {t("homeTitle")}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-[1.7] text-hero-muted md:text-lg">
            {t("homeDescription")}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={routes.tors}>
                {t("browseTors")}
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-hero-foreground/25 bg-transparent text-hero-foreground hover:bg-hero-foreground/10"
            >
              <Link href={routes.monitor}>{t("openMonitor")}</Link>
            </Button>
          </div>

          <dl className="mt-14 grid max-w-3xl gap-6 border-t border-hero-foreground/15 pt-8 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="space-y-1">
                <dt className="text-2xl font-semibold tracking-tight md:text-3xl">
                  {stat.value}
                </dt>
                <dd className="text-sm text-hero-muted">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div aria-hidden className="bma-stripes h-1 opacity-70" />
      </section>

      <HomeBand>
        <HomeCoverage />
      </HomeBand>
      <HomeBand tone="paper">
        <HomeCapabilities />
      </HomeBand>
      <HomeBand>
        <HomeRoles />
      </HomeBand>
      <HomeBand tone="paper">
        <HomeWorkflow />
      </HomeBand>
      <HomeBand>
        <HomeTrust />
      </HomeBand>
      <HomeBand tone="dark">
        <HomeCta />
      </HomeBand>
    </div>
  );
}
