"use client";

import { ShellContent } from "@/components/layout/shell-content";
import { ListingsHero } from "@/components/tor/listings-hero";
import { TorBrowse } from "@/components/tor/tor-browse";
import { useAudience } from "@/components/providers/audience-provider";
import type {
  BudgetAvailability,
  SourceFilter,
} from "@/components/tor/tor-filters";
import type { ListingStage } from "@/lib/listing-stage";
import type {
  IntegrityStatus,
  ListingSort,
  Tor,
} from "@/types/tor";

export function ListingsView({
  tors = [],
  initialQuery = "",
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
  initialCategories?: string[];
  initialSources?: SourceFilter[];
  initialSort?: ListingSort;
  initialStages?: ListingStage[];
  initialBudgetYears?: string[];
  initialBudgetAvailability?: BudgetAvailability[];
  initialIntegrities?: IntegrityStatus[];
}) {
  const audience = useAudience();
  const vendor = audience === "vendor";

  return (
    <div>
      <ListingsHero vendor={vendor} />

      <ShellContent>
        <div className="mx-auto max-w-screen-2xl space-y-10 px-4 pb-12 pt-6 sm:px-6 md:space-y-12 md:pb-16 md:pt-8">
          <TorBrowse
            tors={tors}
            initialQuery={initialQuery}
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
