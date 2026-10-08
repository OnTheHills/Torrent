"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useLocale } from "@/components/providers/locale-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGENCIES, agencyName } from "@/config/agencies";
import type { ListingStage } from "@/lib/listing-stage";
import { cn } from "@/lib/utils";
import { TOR_CATEGORIES } from "@/lib/tor-categories";
import type {
  AgencyId,
  IntegrityStatus,
  ListingSort,
  ListingSource,
} from "@/types/tor";

export type { ListingSort };
export { TOR_CATEGORIES };

export type SourceFilter = Extract<ListingSource, "egp-rss" | "sme-gp" | "bma-egp2">;

export type TorFilterState = {
  agencies: AgencyId[];
  categories: string[];
  sources: SourceFilter[];
  budgetYears: string[];
  integrities: IntegrityStatus[];
  stages: ListingStage[];
  sort: ListingSort;
  teamOnly: boolean;
  skills: string[];
};

export const DEFAULT_FILTERS: TorFilterState = {
  agencies: [],
  categories: [],
  sources: [],
  budgetYears: [],
  integrities: [],
  stages: [],
  sort: "newest",
  teamOnly: false,
  skills: [],
};

function toggleMany<T extends string>(current: T[], value: T, checked: boolean) {
  if (!checked) return current.filter((item) => item !== value);
  return current.includes(value) ? current : [...current, value];
}

function FilterChecks<T extends string>({
  label,
  items,
  isChecked,
  onToggle,
}: {
  label: string;
  items: { value: T; label: string }[];
  isChecked: (value: T) => boolean;
  onToggle: (value: T, checked: boolean) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      {label ? (
        <legend className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </legend>
      ) : null}
      <div className="flex flex-col">
        {items.map((item) => {
          const checked = isChecked(item.value);
          return (
            <label
              key={item.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm leading-snug hover:bg-foreground/5"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onToggle(item.value, event.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-[5px] bg-surface-frost shadow-[inset_0_1px_0_0_var(--surface-frost-highlight)] ring-1 ring-[var(--surface-frost-ring)] backdrop-blur-md backdrop-saturate-150 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/40",
                  checked &&
                    "bg-[var(--palette-teal-75)] text-[var(--palette-teal-700)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--palette-teal-50)_88%,transparent)] ring-[color-mix(in_srgb,var(--palette-teal-300)_70%,transparent)]",
                )}
              >
                {checked ? (
                  <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="size-3" />
                ) : null}
              </span>
              <span>{item.label}</span>
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
    <Select value={value} onValueChange={(sort) => onChange(sort as ListingSort)}>
      <SelectTrigger aria-label={t("sort")} className={cn("h-10! rounded-full", className)}>
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
  const { locale, t } = useLocale();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">{t("filterTitle")}</h3>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-8 shrink-0 items-center rounded-full border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] px-3 text-sm text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none"
        >
          {t("clearFilters")}
        </button>
      </div>
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
        label={t("status")}
        items={[
          { value: "ok", label: t("statusOk") },
          { value: "suspicious", label: t("statusSuspicious") },
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
        label={t("agency")}
        items={AGENCIES.map((agency) => ({
          value: agency.id,
          label: agencyName(agency.id, locale),
        }))}
        isChecked={(agency) => value.agencies.includes(agency)}
        onToggle={(agency, checked) =>
          onChange({
            ...value,
            agencies: toggleMany(value.agencies, agency, checked),
          })
        }
      />

      <FilterChecks
        label={t("source")}
        items={[
          { value: "egp-rss", label: t("sourceRss") },
          { value: "sme-gp", label: t("sourceSmeGp") },
          { value: "bma-egp2", label: t("sourceBmaEgp2") },
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
    </div>
  );
}
