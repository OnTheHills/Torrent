"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ChevronFirstIcon,
  ChevronLastIcon,
} from "@hugeicons/core-free-icons";

import { PageHeader } from "@/components/layout/page-header";
import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { TorTable } from "@/components/tor/tor-table";
import { TorFetchStatus } from "@/components/tor/tor-loading";
import {
  DEFAULT_FILTERS,
  TorFilters,
  type TorFilterState,
} from "@/components/tor/tor-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { torAgency, torDepartment, torTitle } from "@/data/mock";
import type { AgencyId, Tor } from "@/types/tor";
import { fetchTorsForQuery } from "@/lib/api";

const PAGE_SIZE = 20;
const PAGE_WINDOW_SIZE = 5;

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
  const [page, setPage] = useState(1);
  const tableTopRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<TorFilterState>({
    ...DEFAULT_FILTERS,
    agency: initialAgency,
  });
  const vendor = audience === "vendor";

  const { data: tors = [], isFetching, isPending } = useQuery({
    queryKey: ["tors"],
    queryFn: fetchTorsForQuery,
    initialData: initialTors.length > 0 ? initialTors : undefined,
    retry: 30,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
  });

  function applyFilters(next: TorFilterState, nextQuery = query) {
    setFilters(next);
    setPage(1);
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

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRows);
  const pageWindowStart =
    Math.floor((currentPage - 1) / PAGE_WINDOW_SIZE) * PAGE_WINDOW_SIZE + 1;
  const pageWindowEnd = Math.min(
    pageWindowStart + PAGE_WINDOW_SIZE - 1,
    totalPages
  );
  const pageNumbers = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, index) => pageWindowStart + index
  );
  const paginated = useMemo(
    () => filtered.slice(startIndex, endIndex),
    [endIndex, filtered, startIndex]
  );

  function goToPage(nextPage: number) {
    setPage(nextPage);
    window.requestAnimationFrame(() => {
      tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

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
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
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

      {isPending || isFetching ? <TorFetchStatus /> : null}

      <div ref={tableTopRef} className="scroll-mt-6" />

      {(isPending || isFetching) && tors.length === 0 ? null : filtered.length === 0 ? (
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
        <div className="space-y-4">
          <TorTable tors={paginated} />

          {totalRows > PAGE_SIZE ? (
            <nav
              aria-label={t("pageLabel")}
              className="flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
            >
              <p>
                {startIndex + 1}-{endIndex} {t("of")} {totalRows}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={t("firstPage")}
                  disabled={currentPage === 1}
                  onClick={() => goToPage(1)}
                >
                  <HugeiconsIcon icon={ChevronFirstIcon} strokeWidth={1.75} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={t("previousPage")}
                  disabled={currentPage === 1}
                  onClick={() => goToPage(Math.max(1, currentPage - 1))}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.75} />
                </Button>
                {pageNumbers.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    type="button"
                    variant={pageNumber === currentPage ? "default" : "outline"}
                    size="icon"
                    aria-label={`${t("pageLabel")} ${pageNumber}`}
                    aria-current={pageNumber === currentPage ? "page" : undefined}
                    onClick={() => goToPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={t("nextPage")}
                  disabled={currentPage === totalPages}
                  onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.75} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={t("lastPage")}
                  disabled={currentPage === totalPages}
                  onClick={() => goToPage(totalPages)}
                >
                  <HugeiconsIcon icon={ChevronLastIcon} strokeWidth={1.75} />
                </Button>
              </div>
            </nav>
          ) : null}
        </div>
      )}
    </div>
  );
}
