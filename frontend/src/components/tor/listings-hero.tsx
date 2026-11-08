"use client";

import type { CSSProperties } from "react";

import { ShellContent } from "@/components/layout/shell-content";
import { useLocale } from "@/components/providers/locale-provider";

/**
 * Dissolve grid into canvas inside the hero only — never overlap the
 * listings block (that clipped the results count).
 */
const heroFade =
  "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[min(65%,14rem)] bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--background)_45%,transparent)_35%,var(--background)_72%,var(--background)_100%)]";

/** Slightly gray paper; fade lands on the same canvas tone. */
const grayBlueprintStyle = {
  "--blueprint-paper": "var(--palette-gray-50)",
  "--blueprint-grid":
    "color-mix(in srgb, var(--palette-gray-500) 34%, transparent)",
} as CSSProperties;

/**
 * Listings hero — TOR detail category-blueprint under the app bar,
 * shorter content stack, seamless canvas land (no negative-margin overlap).
 */
export function ListingsHero({ vendor = false }: { vendor?: boolean }) {
  const { t } = useLocale();

  return (
    <section
      className="relative -mt-[144px] min-h-[20rem] overflow-hidden category-blueprint text-foreground md:min-h-[22rem]"
      style={grayBlueprintStyle}
    >
      <div aria-hidden className={heroFade} />
      <ShellContent className="relative z-10">
        <div className="relative mx-auto flex min-h-[20rem] max-w-screen-2xl flex-col justify-end px-4 pb-10 pt-[calc(144px+1.25rem)] sm:px-6 md:min-h-[22rem] md:pb-12 md:pt-[calc(144px+1.75rem)]">
          <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <h1 className="whitespace-pre-line text-3xl font-semibold tracking-tight md:text-4xl md:leading-[1.15]">
              {vendor ? t("vendorCatalogTitle") : t("opportunitiesTitle")}
            </h1>
            <p className="mt-3 text-base leading-[1.65] text-muted-foreground md:text-lg">
              {vendor
                ? t("vendorCatalogDescription")
                : t("opportunitiesDescription")}
            </p>
          </div>
        </div>
      </ShellContent>
    </section>
  );
}
