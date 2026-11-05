"use client";

import {
  ADMIN_STATUS_FILTER_ITEMS,
  FilterPanelHeader,
  FilterPanelStack,
  toggleMany,
} from "@/components/filters/filter-panel";
import { FilterChecks } from "@/components/tor/tor-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dropOpenLifecycleStages,
  hasOpenLifecycleStages,
  isOpenLifecycleBudgetYear,
  retainOpenLifecycleBudgetYears,
} from "@/lib/budget-year";
import type { ListingStage } from "@/lib/listing-stage";
import { cn } from "@/lib/utils";

export type ReviewBand = "review" | "manual";
export type ReviewStage = ListingStage;
export type ReviewSort =
  | "closingFirst"
  | "confidenceAsc"
  | "confidenceDesc"
  | "newest"
  | "deadlineAsc"
  | "budgetDesc";

export type ReviewFilterState = {
  bands: ReviewBand[];
  stages: ReviewStage[];
  sources: string[];
  budgetYears: string[];
  sort: ReviewSort;
};

export const DEFAULT_REVIEW_FILTERS: ReviewFilterState = {
  bands: [],
  stages: [],
  sources: [],
  budgetYears: [],
  sort: "closingFirst",
};

export const REVIEW_SOURCES = [
  { value: "DATA-GO-EGP", label: "data.go e-GP" },
  { value: "BMA-EGP2", label: "BMA e-GP2" },
  { value: "EGP-RSS", label: "e-GP RSS" },
  { value: "SME-GP", label: "SME-GP" },
] as const;

export function ReviewSortSelect({
  value,
  onChange,
  className,
}: {
  value: ReviewSort;
  onChange: (sort: ReviewSort) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(sort) => onChange(sort as ReviewSort)}>
      <SelectTrigger
        aria-label="Sort"
        className={cn(
          "h-10! rounded-full border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)]",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="closingFirst">Closing soon first</SelectItem>
        <SelectItem value="confidenceAsc">Lowest confidence</SelectItem>
        <SelectItem value="confidenceDesc">Highest confidence</SelectItem>
        <SelectItem value="newest">Newest published</SelectItem>
        <SelectItem value="deadlineAsc">Deadline soonest</SelectItem>
        <SelectItem value="budgetDesc">Budget high → low</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ReviewFilters({
  value,
  onChange,
  onClear,
  budgetYears = [],
}: {
  value: ReviewFilterState;
  onChange: (next: ReviewFilterState) => void;
  onClear: () => void;
  budgetYears?: string[];
}) {
  return (
    <FilterPanelStack>
      <FilterPanelHeader onClear={onClear} />
      <FilterChecks
        label="Status"
        items={[...ADMIN_STATUS_FILTER_ITEMS]}
        isChecked={(stage) => value.stages.includes(stage)}
        onToggle={(stage, checked) => {
          const stages = toggleMany(value.stages, stage, checked);
          onChange({
            ...value,
            stages,
            budgetYears: hasOpenLifecycleStages(stages)
              ? retainOpenLifecycleBudgetYears(value.budgetYears)
              : value.budgetYears,
          });
        }}
      />
      <FilterChecks
        label="Extraction confidence"
        items={[
          { value: "review", label: "Glance (80–89%)" },
          { value: "manual", label: "Review (<80%)" },
        ]}
        isChecked={(band) => value.bands.includes(band)}
        onToggle={(band, checked) =>
          onChange({ ...value, bands: toggleMany(value.bands, band, checked) })
        }
      />
      {budgetYears.length ? (
        <FilterChecks
          label="Budget year"
          items={budgetYears.map((year) => ({ value: year, label: year }))}
          isChecked={(year) => value.budgetYears.includes(year)}
          isDisabled={(year) =>
            hasOpenLifecycleStages(value.stages) &&
            !isOpenLifecycleBudgetYear(year)
          }
          onToggle={(year, checked) =>
            onChange({
              ...value,
              budgetYears: toggleMany(value.budgetYears, year, checked),
              stages:
                checked && !isOpenLifecycleBudgetYear(year)
                  ? dropOpenLifecycleStages(value.stages)
                  : value.stages,
            })
          }
        />
      ) : null}
      <FilterChecks
        label="Source"
        items={REVIEW_SOURCES.map((source) => ({
          value: source.value,
          label: source.label,
        }))}
        isChecked={(source) => value.sources.includes(source)}
        onToggle={(source, checked) =>
          onChange({
            ...value,
            sources: toggleMany(value.sources, source, checked),
          })
        }
      />
    </FilterPanelStack>
  );
}
