"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { TorBrowse } from "@/components/tor/tor-browse";
import type { AgencyId, Tor } from "@/types/tor";

export function ListingsView({
  tors = [],
  initialQuery = "",
  initialAgency = "all",
}: {
  tors?: Tor[];
  initialQuery?: string;
  initialAgency?: AgencyId | "all";
}) {
  const { t } = useLocale();

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(72px+4rem)] sm:px-6 md:pb-12 md:pt-[calc(72px+6rem)]">
          <div className="mt-2 w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hero-muted">
              {t("opportunitiesEyebrow")}
            </p>
            <h1 className="mt-4 whitespace-pre-line text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              {t("opportunitiesTitle")}
            </h1>
            <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
              {t("opportunitiesDescription")}
            </p>
          </div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
        <TorBrowse
          tors={tors}
          initialQuery={initialQuery}
          initialAgency={initialAgency}
          showHeader={false}
        />
      </div>
    </div>
  );
}
