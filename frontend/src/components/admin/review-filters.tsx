"use client";

import { FilterChecks } from "@/components/tor/tor-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ReviewBand = "review" | "manual";
export type ReviewStage = "closing" | "open" | "draft";
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

function toggleMany<T extends string>(current: T[], value: T, checked: boolean) {
  if (!checked) return current.filter((item) => item !== value);
  return current.includes(value) ? current : [...current, value];
}

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">Filters</h3>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-8 shrink-0 items-center rounded-full border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] px-3 text-sm text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none"
        >
          Clear
        </button>
      </div>
      <FilterChecks
        label="Lifecycle"
        items={[
          { value: "closing", label: "Closing soon" },
          { value: "open", label: "Open" },
          { value: "draft", label: "Draft" },
        ]}
        isChecked={(stage) => value.stages.includes(stage)}
        onToggle={(stage, checked) =>
          onChange({ ...value, stages: toggleMany(value.stages, stage, checked) })
        }
      />
      <FilterChecks
        label="Confidence"
        items={[
          { value: "review", label: "Lookup (80–89%)" },
          { value: "manual", label: "Must check (<80%)" },
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
          onToggle={(year, checked) =>
            onChange({
              ...value,
              budgetYears: toggleMany(value.budgetYears, year, checked),
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
    </div>
  );
}
