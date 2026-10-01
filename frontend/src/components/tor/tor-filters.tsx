"use client";

import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGENCIES, agencyName } from "@/config/agencies";
import type {
  AgencyId,
  BudgetBand,
  IntegrityStatus,
  ListingSort,
  ListingSource,
  TorLifecycle,
} from "@/types/tor";

export type { ListingSort };

export type TorFilterState = {
  agency: AgencyId | "all";
  source: ListingSource;
  budget: BudgetBand;
  integrity: IntegrityStatus | "all";
  lifecycle: TorLifecycle | "all";
  sort: ListingSort;
  teamOnly: boolean;
  skills: string[];
};

export const DEFAULT_FILTERS: TorFilterState = {
  agency: "all",
  source: "all",
  budget: "all",
  integrity: "all",
  lifecycle: "all",
  sort: "newest",
  teamOnly: false,
  skills: [],
};

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterSelect<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger className="h-11! w-full rounded-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TorFilters({
  value,
  onChange,
  onClear,
  showMatchFilter = false,
}: {
  value: TorFilterState;
  onChange: (next: TorFilterState) => void;
  onClear: () => void;
  showMatchFilter?: boolean;
}) {
  const { locale, t } = useLocale();

  return (
    <div className="flex flex-col gap-4">
      <FilterField label={t("sort")}>
        <FilterSelect
          value={value.sort}
          onChange={(sort) => onChange({ ...value, sort })}
          items={[
            { value: "newest", label: t("sortNewest") },
            { value: "oldest", label: t("sortOldest") },
            { value: "budgetDesc", label: t("sortBudgetHigh") },
            { value: "budgetAsc", label: t("sortBudgetLow") },
          ]}
        />
      </FilterField>

      <FilterField label={t("agency")}>
        <FilterSelect
          value={value.agency}
          onChange={(agency) =>
            onChange({ ...value, agency: agency as AgencyId | "all" })
          }
          items={[
            { value: "all", label: t("allAgencies") },
            ...AGENCIES.map((agency) => ({
              value: agency.id,
              label: agencyName(agency.id, locale),
            })),
          ]}
        />
      </FilterField>

      <FilterField label={t("source")}>
        <FilterSelect
          value={value.source}
          onChange={(source) =>
            onChange({ ...value, source: source as ListingSource })
          }
          items={[
            { value: "all", label: t("allSources") },
            { value: "egp-rss", label: t("sourceRss") },
            { value: "sme-gp", label: t("sourceSmeGp") },
            { value: "bma-egp2", label: t("sourceBmaEgp2") },
          ]}
        />
      </FilterField>

      <FilterField label={t("lifecycle")}>
        <FilterSelect
          value={value.lifecycle}
          onChange={(lifecycle) =>
            onChange({ ...value, lifecycle: lifecycle as TorLifecycle | "all" })
          }
          items={[
            { value: "all", label: t("stageAll") },
            { value: "draft", label: t("draft") },
            { value: "published", label: t("published") },
            { value: "awarded", label: t("awarded") },
          ]}
        />
      </FilterField>

      <FilterField label={t("budgetRange")}>
        <FilterSelect
          value={value.budget}
          onChange={(budget) =>
            onChange({ ...value, budget: budget as BudgetBand })
          }
          items={[
            { value: "all", label: t("budgetAll") },
            { value: "lt5", label: t("budgetLt5") },
            { value: "5to15", label: t("budget5to15") },
            { value: "gt15", label: t("budgetGt15") },
          ]}
        />
      </FilterField>

      <FilterField label={t("status")}>
        <FilterSelect
          value={value.integrity}
          onChange={(integrity) =>
            onChange({
              ...value,
              integrity: integrity as IntegrityStatus | "all",
            })
          }
          items={[
            { value: "all", label: t("statusAll") },
            { value: "ok", label: t("statusOk") },
            { value: "suspicious", label: t("statusSuspicious") },
          ]}
        />
      </FilterField>

      {showMatchFilter ? (
        <Button
          type="button"
          size="sm"
          variant={value.teamOnly ? "orange" : "outline"}
          className="h-11! w-full rounded-full"
          aria-pressed={value.teamOnly}
          onClick={() => onChange({ ...value, teamOnly: !value.teamOnly })}
        >
          {t("teamOnly")}
        </Button>
      ) : null}

      <Button
        type="button"
        variant="destructive"
        className="h-11! w-full rounded-full bg-[color-mix(in_srgb,var(--palette-red-400)_40%,transparent)] text-[var(--palette-red-700)] ring-[color-mix(in_srgb,var(--palette-red-500)_72%,transparent)] hover:bg-[color-mix(in_srgb,var(--palette-red-400)_52%,transparent)] dark:text-[var(--palette-red-100)]"
        onClick={onClear}
      >
        {t("clearFilters")}
      </Button>
    </div>
  );
}
