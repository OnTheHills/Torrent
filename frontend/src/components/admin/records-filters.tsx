"use client";

import {
  ADMIN_STATUS_FILTER_ITEMS,
  ADMIN_WATCH_OUT_FILTER_ITEMS,
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

export type RecordsVisibility = "visible" | "hidden";
export type RecordsStage = ListingStage;
export type RecordsReview = "auto" | "review" | "manual";
export type RecordsBudgetAvailability = "specified" | "missing";
export type RecordsWatchOut = "clear" | "watch";
export type RecordsSort =
  | "newest"
  | "oldest"
  | "budgetDesc"
  | "confidenceDesc"
  | "confidenceAsc";

export type RecordsFilterState = {
  visibility: RecordsVisibility[];
  stages: RecordsStage[];
  reviews: RecordsReview[];
  budgetAvailability: RecordsBudgetAvailability[];
  watchOut: RecordsWatchOut[];
  sources: string[];
  budgetYears: string[];
  sort: RecordsSort;
};

export const DEFAULT_RECORDS_FILTERS: RecordsFilterState = {
  visibility: [],
  stages: [],
  reviews: [],
  budgetAvailability: [],
  watchOut: [],
  sources: [],
  budgetYears: [],
  sort: "newest",
};

export const RECORDS_SOURCES = [
  { value: "DATA-GO-EGP", label: "data.go e-GP" },
  { value: "BMA-EGP2", label: "BMA e-GP2" },
  { value: "EGP-RSS", label: "e-GP RSS" },
  { value: "SME-GP", label: "SME-GP" },
] as const;

export function RecordsSortSelect({
  value,
  onChange,
  className,
}: {
  value: RecordsSort;
  onChange: (sort: RecordsSort) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(sort) => onChange(sort as RecordsSort)}>
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
        <SelectItem value="newest">Newest published</SelectItem>
        <SelectItem value="oldest">Oldest published</SelectItem>
        <SelectItem value="budgetDesc">Budget high → low</SelectItem>
        <SelectItem value="confidenceDesc">Highest confidence</SelectItem>
        <SelectItem value="confidenceAsc">Lowest confidence</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function RecordsFilters({
  value,
  onChange,
  onClear,
  budgetYears = [],
}: {
  value: RecordsFilterState;
  onChange: (next: RecordsFilterState) => void;
  onClear: () => void;
  budgetYears?: string[];
}) {
  return (
    <FilterPanelStack>
      <FilterPanelHeader onClear={onClear} />
      <FilterChecks
        label="Visibility"
        items={[
          { value: "visible", label: "Visible" },
          { value: "hidden", label: "Hidden" },
        ]}
        isChecked={(item) => value.visibility.includes(item)}
        onToggle={(item, checked) =>
          onChange({
            ...value,
            visibility: toggleMany(value.visibility, item, checked),
          })
        }
      />
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
          { value: "auto", label: "Ready (≥90%)" },
          { value: "review", label: "Glance (80–89%)" },
          { value: "manual", label: "Review (<80%)" },
        ]}
        isChecked={(band) => value.reviews.includes(band)}
        onToggle={(band, checked) =>
          onChange({ ...value, reviews: toggleMany(value.reviews, band, checked) })
        }
      />
      <FilterChecks
        label="Watch out"
        items={[...ADMIN_WATCH_OUT_FILTER_ITEMS]}
        isChecked={(item) => value.watchOut.includes(item)}
        onToggle={(item, checked) =>
          onChange({
            ...value,
            watchOut: toggleMany(value.watchOut, item, checked),
          })
        }
      />
      <FilterChecks
        label="Budget amount"
        items={[
          { value: "specified", label: "Known" },
          { value: "missing", label: "Unknown" },
        ]}
        isChecked={(item) => value.budgetAvailability.includes(item)}
        onToggle={(item, checked) =>
          onChange({
            ...value,
            budgetAvailability: toggleMany(
              value.budgetAvailability,
              item,
              checked,
            ),
          })
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
        items={RECORDS_SOURCES.map((source) => ({
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
