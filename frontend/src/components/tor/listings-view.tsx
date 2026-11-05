"use client";

import { ShellContent } from "@/components/layout/shell-content";
import { useLocale } from "@/components/providers/locale-provider";
import { TorBrowse } from "@/components/tor/tor-browse";
import type {
  BudgetAvailability,
  SourceFilter,
} from "@/components/tor/tor-filters";
import type { ListingStage } from "@/lib/listing-stage";
import type {
  AgencyId,
  IntegrityStatus,
  ListingSort,
  Tor,
} from "@/types/tor";

export function ListingsView({
  tors = [],
  initialQuery = "",
  initialAgencies = [],
  initialCategories = [],
  initialSources = [],
  initialSort = "newest",
  initialStages = [],
  initialBudgetYears = [],
  initialBudgetAvailability = [],
  initialIntegrities = [],
}: {
  tors?: Tor[];
  initialQuery?: string;
  initialAgencies?: AgencyId[];
  initialCategories?: string[];
  initialSources?: SourceFilter[];
  initialSort?: ListingSort;
  initialStages?: ListingStage[];
  initialBudgetYears?: string[];
  initialBudgetAvailability?: BudgetAvailability[];
  initialIntegrities?: IntegrityStatus[];
}) {
  const { t } = useLocale();

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <ShellContent>
          <div className="relative mx-auto max-w-screen-2xl px-4 pb-8 pt-[calc(144px+2rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3rem)]">
            <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
              <h1 className="whitespace-pre-line text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
                {t("opportunitiesTitle")}
              </h1>
              <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
                {t("opportunitiesDescription")}
              </p>
            </div>
          </div>
        </ShellContent>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <ShellContent>
        <div className="mx-auto max-w-screen-2xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
          <TorBrowse
            tors={tors}
            initialQuery={initialQuery}
            initialAgencies={initialAgencies}
            initialCategories={initialCategories}
            initialSources={initialSources}
            initialSort={initialSort}
            initialStages={initialStages}
            initialBudgetYears={initialBudgetYears}
            initialBudgetAvailability={initialBudgetAvailability}
            initialIntegrities={initialIntegrities}
            showHeader={false}
          />
        </div>
      </ShellContent>
    </div>
  );
}
