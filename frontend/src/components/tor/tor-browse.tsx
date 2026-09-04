"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { TorTable } from "@/components/tor/tor-table";
import {
  DEFAULT_FILTERS,
  TorFilters,
  type TorFilterState,
} from "@/components/tor/tor-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { torAgency, torDepartment, torTitle } from "@/data/mock";
import type { AgencyId, Tor } from "@/types/tor";
import { fetchTors } from "@/lib/api";

function inBudgetBand(amount: number, band: TorFilterState["budget"]) {
  if (band === "all") return true;
  if (band === "lt5") return amount < 5_000_000;
  if (band === "5to15") return amount >= 5_000_000 && amount <= 15_000_000;
  return amount > 15_000_000;
}

export function TorBrowse({
  tors: initialTors,
  initialQuery = "",
  initialAgency = "all",
  showHeader = true,
}: {
  tors: Tor[];
  initialQuery?: string;
  initialAgency?: AgencyId | "all";
  showHeader?: boolean;
}) {
  const { locale, t } = useLocale();
  const audience = useAudience();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<TorFilterState>({
    ...DEFAULT_FILTERS,
    agency: initialAgency,
  });
  const vendor = audience === "vendor";

  const { data: tors = [] } = useQuery({
    queryKey: ["tors"],
    queryFn: fetchTors,
    initialData: initialTors,
  });

  function applyFilters(next: TorFilterState, nextQuery = query) {
    setFilters(next);
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (next.agency !== "all") params.set("agency", next.agency);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tors.filter((tor) => {
      const dept = torDepartment(tor, locale);
      const agency = torAgency(tor, locale);
      const title = torTitle(tor, locale);
      const matchesAgency = filters.agency === "all" || tor.agencyId === filters.agency;
      const matchesBudget = inBudgetBand(tor.budgetThb, filters.budget);
      const matchesIntegrity =
        filters.integrity === "all" || tor.integrity === filters.integrity;
      const matchesTeam =
        !vendor ||
        !filters.teamOnly ||
        (typeof tor.matchScore === "number" && tor.matchScore >= 80);
      const matchesSkills =
        filters.skills.length === 0 ||
        filters.skills.every((skill) => tor.skills.includes(skill));
      const matchesQuery =
        !q ||
        title.toLowerCase().includes(q) ||
        agency.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q) ||
        tor.skills.some((skill) => skill.toLowerCase().includes(q)) ||
        tor.refId.toLowerCase().includes(q);

      return (
        matchesAgency &&
        matchesBudget &&
        matchesIntegrity &&
        matchesTeam &&
        matchesSkills &&
        matchesQuery
      );
    });
  }, [filters, locale, query, tors, vendor]);

  return (
    <div className="space-y-8">
      {showHeader ? (
        <PageHeader
          eyebrow={t("opportunitiesEyebrow")}
          title={vendor ? t("vendorCatalogTitle") : t("opportunitiesTitle")}
          description={
            vendor ? t("vendorCatalogDescription") : t("opportunitiesDescription")
          }
        />
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-9 sm:max-w-sm"
          />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
            {t("of")} {tors.length} {t("results")}
          </p>
        </div>
        <TorFilters
          value={filters}
          onChange={applyFilters}
          onClear={() => applyFilters(DEFAULT_FILTERS)}
          showMatchFilter={vendor}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-heading text-lg font-medium">{t("emptyFilters")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => {
              setQuery("");
              applyFilters(DEFAULT_FILTERS, "");
            }}
          >
            {t("resetFilters")}
          </Button>
        </div>
      ) : (
        <TorTable tors={filtered} />
      )}
    </div>
  );
}
