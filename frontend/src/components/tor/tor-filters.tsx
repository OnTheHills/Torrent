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
import { SKILL_OPTIONS } from "@/data/mock";
import { cn } from "@/lib/utils";
import { AGENCIES, agencyName } from "@/config/agencies";
import type { AgencyId, BudgetBand, IntegrityStatus, TorLifecycle } from "@/types/tor";

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

  function toggleSkill(skill: string) {
    const exists = value.skills.includes(skill);
    onChange({
      ...value,
      skills: exists
        ? value.skills.filter((item) => item !== skill)
        : [...value.skills, skill],
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/95 p-4 backdrop-blur-md">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[10rem] flex-1 space-y-1.5">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t("agency")}
          </span>
          <Select
            value={value.agency}
            onValueChange={(agency) =>
              onChange({ ...value, agency: agency as AgencyId | "all" })
            }
          >
            <SelectTrigger className="h-9 w-full">
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

        <label className="min-w-[8rem] space-y-1.5">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t("budgetRange")}
          </span>
          <Select
            value={value.budget}
            onValueChange={(budget) =>
              onChange({ ...value, budget: budget as BudgetBand })
            }
          >
            <SelectTrigger className="h-9 w-full">
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

        <label className="min-w-[8rem] space-y-1.5">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
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
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("statusAll")}</SelectItem>
              <SelectItem value="ok">{t("statusOk")}</SelectItem>
              <SelectItem value="suspicious">{t("statusSuspicious")}</SelectItem>
            </SelectContent>
          </Select>
        </label>

        {showMatchFilter ? (
          <Button
            type="button"
            variant={value.teamOnly ? "default" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => onChange({ ...value, teamOnly: !value.teamOnly })}
          >
            {t("teamOnly")}
          </Button>
        ) : null}

        <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClear}>
          {t("clearFilters")}
        </Button>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {t("skills")}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {SKILL_OPTIONS.map((skill) => {
            const active = value.skills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={cn(
                  "text-xs transition-colors",
                  active
                    ? "font-semibold text-primary underline underline-offset-4"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {skill}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
