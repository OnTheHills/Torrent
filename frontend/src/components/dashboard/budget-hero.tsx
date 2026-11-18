"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { MoneyBag02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChartPie } from "lucide-react";

import { EcgTrace } from "@/components/dashboard/ecg-trace";
import { HeroTitle } from "@/components/layout/hero-title";
import { ShellContent } from "@/components/layout/shell-content";
import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

const tealField = {
  backgroundColor: "#d5f0e6",
  backgroundImage: [
    "radial-gradient(ellipse 42% 70% at 4% 58%, #b8dccb, transparent)",
    "radial-gradient(ellipse 36% 60% at 28% 36%, #8ccab9, transparent)",
    "radial-gradient(ellipse 40% 64% at 74% 42%, #a8decc, transparent)",
    "radial-gradient(ellipse 42% 70% at 96% 78%, #7ecbb3, transparent)",
  ].join(","),
} as CSSProperties;

export function BudgetHero() {
  const { t } = useLocale();
  const vendor = useAudience() === "vendor";

  return (
    <section className="relative -mt-[144px] overflow-hidden text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={tealField}
      />
      <EcgTrace />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[4.25rem] bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--background)_12%,transparent)_25%,color-mix(in_srgb,var(--background)_45%,transparent)_50%,color-mix(in_srgb,var(--background)_78%,transparent)_75%,var(--background)_100%)] md:h-[6.25rem]"
      />
      <ShellContent className="relative z-10">
        <div className="relative mx-auto flex max-w-6xl flex-col justify-start px-4 pb-10 pt-[calc(144px+2.5rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3.5rem)]">
          <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl">
            <HeroTitle
              preLine
              icon={
                vendor ? (
                  <ChartPie strokeWidth={1.75} />
                ) : (
                  <HugeiconsIcon icon={MoneyBag02Icon} strokeWidth={1.75} />
                )
              }
            >
              {t("dashboardTitle")}
            </HeroTitle>
            <p className="mt-5 text-base leading-[1.7] text-muted-foreground md:text-lg">
              {t("dashboardDescription")}
            </p>
          </div>
          {vendor ? null : (
            <div className="mt-8">
              <Button asChild size="lg" variant="outline">
                <Link href={routes.monitor}>{t("openMonitor")}</Link>
              </Button>
            </div>
          )}
        </div>
      </ShellContent>
    </section>
  );
}
