"use client";

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
  TorLifecycle,
} from "@/types/tor";

export type TorFilterState = {
  agency: AgencyId | "all";
  budget: BudgetBand;
  integrity: IntegrityStatus | "all";
  lifecycle: TorLifecycle | "all";
  teamOnly: boolean;
  skills: string[];
};

export const DEFAULT_FILTERS: TorFilterState = {
  agency: "all",
  budget: "all",
  integrity: "all",
  lifecycle: "all",
  teamOnly: false,
  skills: [],
};

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
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            {t("agency")}
          </span>
          <Select
            value={value.agency}
            onValueChange={(agency) =>
              onChange({ ...value, agency: agency as AgencyId | "all" })
            }
          >
            <SelectTrigger className="h-9! w-full">
              <SelectValue placeholder={t("allAgencies")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allAgencies")}</SelectItem>
              {AGENCIES.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agencyName(agency.id, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            {t("budgetRange")}
          </span>
          <Select
            value={value.budget}
            onValueChange={(budget) =>
              onChange({ ...value, budget: budget as BudgetBand })
            }
          >
            <SelectTrigger className="h-9! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("budgetAll")}</SelectItem>
              <SelectItem value="lt5">{t("budgetLt5")}</SelectItem>
              <SelectItem value="5to15">{t("budget5to15")}</SelectItem>
              <SelectItem value="gt15">{t("budgetGt15")}</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            {t("status")}
          </span>
          <Select
            value={value.integrity}
            onValueChange={(integrity) =>
              onChange({
                ...value,
                integrity: integrity as IntegrityStatus | "all",
              })
            }
          >
            <SelectTrigger className="h-9! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("statusAll")}</SelectItem>
              <SelectItem value="ok">{t("statusOk")}</SelectItem>
              <SelectItem value="suspicious">{t("statusSuspicious")}</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <div className="flex flex-col justify-end">
          <Button
            type="button"
            variant="destructive"
            className="h-9! px-5 bg-[color-mix(in_srgb,var(--palette-red-400)_40%,transparent)] text-[var(--palette-red-700)] ring-[color-mix(in_srgb,var(--palette-red-500)_72%,transparent)] hover:bg-[color-mix(in_srgb,var(--palette-red-400)_52%,transparent)] dark:text-[var(--palette-red-100)]"
            onClick={onClear}
          >
            {t("clearFilters")}
          </Button>
        </div>
      </div>

      {showMatchFilter ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={value.teamOnly ? "orange" : "outline"}
            aria-pressed={value.teamOnly}
            onClick={() => onChange({ ...value, teamOnly: !value.teamOnly })}
          >
            {t("teamOnly")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
