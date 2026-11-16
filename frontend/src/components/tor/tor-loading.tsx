"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  FilterCountPill,
  FilterPanelAside,
  FilterPanelLayout,
} from "@/components/filters/filter-panel";
import { ShellContent } from "@/components/layout/shell-content";
import { MonitorSection } from "@/components/monitor/monitor-section";
import { useLocale } from "@/components/providers/locale-provider";
import { ListingFrostCardSkeleton } from "@/components/tor/listing-frost-card";
import { ListingsHero } from "@/components/tor/listings-hero";
import {
  DEFAULT_FILTERS,
  TorFilters,
  TorSort,
} from "@/components/tor/tor-filters";
import { Input } from "@/components/ui/input";

export function TorFetchStatus() {
  const { locale } = useLocale();

  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <span
        aria-hidden="true"
        className="size-4 rounded-full border-2 border-primary/25 border-t-primary motion-safe:animate-spin"
      />
      {locale === "th" ? "กำลังโหลดรายการ TOR…" : "Loading TOR listings…"}
    </p>
  );
}

export function ListingCardsSkeleton({ count = 12 }: { count?: number }) {
  const { locale } = useLocale();

  return (
    <div
      role="status"
      aria-live="polite"
      className="grid gap-4 overflow-visible sm:grid-cols-2 xl:grid-cols-3"
    >
      <span className="sr-only">
        {locale === "th" ? "กำลังโหลดรายการ TOR…" : "Loading TOR listings…"}
      </span>
      {Array.from({ length: count }, (_, index) => (
        <ListingFrostCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function TorLoading({ vendor = false }: { vendor?: boolean }) {
  const { t } = useLocale();

  return (
    <div aria-busy="true">
      <ListingsHero vendor={vendor} />
      <ShellContent>
        <div className="mx-auto max-w-screen-2xl space-y-10 px-4 pb-12 pt-6 sm:px-6 md:space-y-12 md:pb-16 md:pt-8">
          <FilterPanelLayout>
            <div className="flex items-center gap-3 lg:col-span-2">
              <label className="relative isolate block min-w-0 flex-1 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]"
                />
                <span className="sr-only">{t("searchPlaceholder")}</span>
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  disabled
                  placeholder={t("searchPlaceholder")}
                  className="relative h-10 rounded-full border-0 bg-transparent pl-11 text-foreground shadow-none ring-0 placeholder:text-[var(--palette-gray-600)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring/30"
                />
              </label>
              <TorSort
                value={DEFAULT_FILTERS.sort}
                onChange={() => {}}
                className="pointer-events-none w-44 shrink-0 border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] sm:w-52"
              />
              <FilterCountPill>
                <span className="font-semibold tabular-nums">—</span>
                <span className="ml-1 opacity-80">{t("results")}</span>
              </FilterCountPill>
            </div>

            <FilterPanelAside className="pointer-events-none">
              <TorFilters
                value={DEFAULT_FILTERS}
                onChange={() => {}}
                onClear={() => {}}
                showMatchFilter={vendor}
              />
            </FilterPanelAside>

            <MonitorSection
              className="min-w-0"
              surfaceClassName="bg-transparent p-0 ring-0 shadow-none md:p-0"
            >
              <ListingCardsSkeleton />
            </MonitorSection>
          </FilterPanelLayout>
        </div>
      </ShellContent>
    </div>
  );
}
