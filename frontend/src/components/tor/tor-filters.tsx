"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  FilterPanelHeader,
  FilterPanelStack,
  toggleMany,
} from "@/components/filters/filter-panel";
import { useLocale } from "@/components/providers/locale-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ListingStage } from "@/lib/listing-stage";
import { cn } from "@/lib/utils";
import { TOR_CATEGORIES } from "@/lib/tor-categories";
import type {
  IntegrityStatus,
  ListingSort,
  ListingSource,
} from "@/types/tor";

export type { ListingSort };
export { TOR_CATEGORIES };

export type SourceFilter = Extract<
  ListingSource,
  "egp-rss" | "sme-gp" | "bma-egp2" | "data-go"
>;

export type BudgetAvailability = "specified" | "missing";

export type TorFilterState = {
  categories: string[];
  sources: SourceFilter[];
  budgetYears: string[];
  budgetAvailability: BudgetAvailability[];
  integrities: IntegrityStatus[];
  stages: ListingStage[];
  sort: ListingSort;
  teamOnly: boolean;
  skills: string[];
};

export const DEFAULT_FILTERS: TorFilterState = {
  categories: [],
  sources: [],
  budgetYears: [],
  budgetAvailability: [],
  integrities: [],
  stages: [],
  sort: "newest",
  teamOnly: false,
  skills: [],
};

/** Neutral frost control — same recipe as admin frost buttons, sized for checkboxes. */
export const frostCheckbox =
  "flex size-4 shrink-0 items-center justify-center rounded-[5px] bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/40";

export const frostCheckboxChecked = "text-foreground";

/** Selected row/pill fill — matches sidebar active tab (flat dim lens, no frost). */
export const frostSelectedItem =
  "bg-sidebar-accent text-sidebar-accent-foreground shadow-none ring-0";

export function FrostCheckbox({
  checked,
  className,
}: {
  checked: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(frostCheckbox, checked && frostCheckboxChecked, className)}
    >
      {checked ? (
        <HugeiconsIcon
          icon={Tick02Icon}
          strokeWidth={2.5}
          className="size-3 text-foreground"
        />
      ) : null}
    </span>
  );
}

export function FilterChecks<T extends string>({
  label,
  items,
  isChecked,
  onToggle,
  isDisabled,
}: {
  label: string;
  items: { value: T; label: string }[];
  isChecked: (value: T) => boolean;
  onToggle: (value: T, checked: boolean) => void;
  isDisabled?: (value: T) => boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-0.5">
      {label ? (
        <legend className="px-2.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </legend>
      ) : null}
      <div className="flex flex-col gap-px">
        {items.map((item) => {
          const checked = isChecked(item.value);
          const disabled = Boolean(isDisabled?.(item.value));
          return (
            <label
              key={item.value}
              className={cn(
                // Flat rounded pill; selected stays flat (no glass hover). Slimmer than sidebar nav.
                "flex h-8 cursor-pointer items-center gap-2 overflow-hidden rounded-full py-0 pl-4 pr-3 text-xs font-medium leading-snug text-sidebar-foreground outline-none transition-[background-color,box-shadow,color] duration-150 ease-out",
                checked
                  ? frostSelectedItem
                  : "hover:bg-sidebar-hover hover:shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)]",
                disabled &&
                  "cursor-not-allowed opacity-45 hover:bg-transparent hover:shadow-none",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) => onToggle(item.value, event.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "flex size-3.5 shrink-0 items-center justify-center rounded-full ring-1 ring-foreground/30",
                  checked && "bg-foreground ring-foreground",
                )}
              >
                {checked ? (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    strokeWidth={2.5}
                    className="size-2 text-background"
                  />
                ) : null}
              </span>
              <span className="min-w-0 truncate">{item.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function TorSort({
  value,
  onChange,
  className,
}: {
  value: ListingSort;
  onChange: (sort: ListingSort) => void;
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <Select
      value={value}
      onValueChange={(sort) => onChange(sort as ListingSort)}
    >
      <SelectTrigger
        aria-label={t("sort")}
        className={cn("h-10! rounded-full", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">{t("sortNewest")}</SelectItem>
        <SelectItem value="oldest">{t("sortOldest")}</SelectItem>
        <SelectItem value="budgetDesc">{t("sortBudgetHigh")}</SelectItem>
        <SelectItem value="budgetAsc">{t("sortBudgetLow")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function TorFilters({
  value,
  onChange,
  onClear,
  budgetYears = [],
  showMatchFilter = false,
}: {
  value: TorFilterState;
  onChange: (next: TorFilterState) => void;
  onClear: () => void;
  budgetYears?: string[];
  showMatchFilter?: boolean;
}) {
  const { t } = useLocale();

  return (
    <FilterPanelStack>
      <FilterPanelHeader
        title={t("filterTitle")}
        clearLabel={t("clearFilters")}
        onClear={onClear}
      />
      <FilterChecks
        label={t("lifecycle")}
        items={[
          { value: "open", label: t("stageOpen") },
          { value: "closing", label: t("stageClosing") },
          { value: "draft", label: t("stageDraft") },
          { value: "closed", label: t("stageClosed") },
          { value: "awarded", label: t("stageWinner") },
          { value: "cancelled", label: t("stageCancelled") },
        ]}
        isChecked={(stage) => value.stages.includes(stage)}
        onToggle={(stage, checked) =>
          onChange({
            ...value,
            stages: toggleMany(value.stages, stage, checked),
          })
        }
      />

      {budgetYears.length ? (
        <FilterChecks
          label={t("budgetYear")}
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
        label={t("watchOut")}
        items={[
          { value: "ok", label: t("watchOutClear") },
          { value: "suspicious", label: t("watchOutFlagged") },
        ]}
        isChecked={(integrity) => value.integrities.includes(integrity)}
        onToggle={(integrity, checked) =>
          onChange({
            ...value,
            integrities: toggleMany(value.integrities, integrity, checked),
          })
        }
      />

      <FilterChecks
        label={t("budgetAmount")}
        items={[
          { value: "specified", label: t("budgetAmountKnown") },
          { value: "missing", label: t("budgetAmountUnknown") },
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

      <FilterChecks
        label={t("category")}
        items={TOR_CATEGORIES.map((category) => ({
          value: category,
          label: category,
        }))}
        isChecked={(category) => value.categories.includes(category)}
        onToggle={(category, checked) =>
          onChange({
            ...value,
            categories: toggleMany(value.categories, category, checked),
          })
        }
      />

      <FilterChecks
        label={t("source")}
        items={[
          { value: "egp-rss", label: t("sourceRss") },
          { value: "sme-gp", label: t("sourceSmeGp") },
          { value: "bma-egp2", label: t("sourceBmaEgp2") },
          { value: "data-go", label: t("sourceDataGo") },
        ]}
        isChecked={(source) => value.sources.includes(source)}
        onToggle={(source, checked) =>
          onChange({
            ...value,
            sources: toggleMany(value.sources, source, checked),
          })
        }
      />

      {showMatchFilter ? (
        <FilterChecks
          label=""
          items={[{ value: "team", label: t("teamOnly") }]}
          isChecked={() => value.teamOnly}
          onToggle={(_, checked) => onChange({ ...value, teamOnly: checked })}
        />
      ) : null}
    </FilterPanelStack>
  );
}
