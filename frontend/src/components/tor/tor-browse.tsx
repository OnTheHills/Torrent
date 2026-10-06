"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ChevronFirstIcon,
  ChevronLastIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { MonitorSection } from "@/components/monitor/monitor-section";
import { PageHeader } from "@/components/layout/page-header";
import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { ListingFrostCard } from "@/components/tor/listing-frost-card";
import {
  DEFAULT_FILTERS,
  TorFilters,
  TorSort,
  type SourceFilter,
  type TorFilterState,
} from "@/components/tor/tor-filters";
import { TorFetchStatus } from "@/components/tor/tor-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { torAgency, torDepartment, torTitle } from "@/data/mock";
import { fetchTorsForQuery } from "@/lib/api";
import { listingStage, type ListingStage } from "@/lib/listing-stage";
import {
  parseListingSort,
  type AgencyId,
  type IntegrityStatus,
  type ListingSort,
  type Tor,
} from "@/types/tor";

const PAGE_SIZE = 12;
const PAGE_WINDOW_SIZE = 5;

function knownBudget(amount: number) {
  return Number.isFinite(amount) && amount > 0;
}

function compareListings(a: Tor, b: Tor, sort: ListingSort) {
  if (sort === "newest") return b.publishedAt.localeCompare(a.publishedAt);
  if (sort === "oldest") return a.publishedAt.localeCompare(b.publishedAt);

  const aKnown = knownBudget(a.budgetThb) ? 1 : 0;
  const bKnown = knownBudget(b.budgetThb) ? 1 : 0;
  if (aKnown !== bKnown) return bKnown - aKnown;
  return sort === "budgetDesc"
    ? b.budgetThb - a.budgetThb
    : a.budgetThb - b.budgetThb;
}

export function TorBrowse({
  tors: initialTors,
  initialQuery = "",
  initialAgencies = [],
  initialCategories = [],
  initialSources = [],
  initialSort = "newest",
  initialStages = [],
  initialBudgetYears = [],
  initialIntegrities = [],
  showHeader = true,
}: {
  tors: Tor[];
  initialQuery?: string;
  initialAgencies?: AgencyId[];
  initialCategories?: string[];
  initialSources?: SourceFilter[];
  initialSort?: ListingSort;
  initialStages?: ListingStage[];
  initialBudgetYears?: string[];
  initialIntegrities?: IntegrityStatus[];
  showHeader?: boolean;
}) {
  const { locale, t } = useLocale();
  const audience = useAudience();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const listTopRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<TorFilterState>({
    ...DEFAULT_FILTERS,
    agencies: initialAgencies,
    categories: initialCategories,
    sources: initialSources,
    budgetYears: initialBudgetYears,
    integrities: initialIntegrities,
    stages: initialStages,
    sort: parseListingSort(initialSort),
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
    if (next.agencies.length) params.set("agency", next.agencies.join(","));
    if (next.categories.length) params.set("category", next.categories.join(","));
    if (next.sources.length) params.set("source", next.sources.join(","));
    if (next.budgetYears.length) params.set("year", next.budgetYears.join(","));
    if (next.integrities.length) params.set("integrity", next.integrities.join(","));
    if (next.sort !== "newest") params.set("sort", next.sort);
    if (next.stages.length) params.set("stage", next.stages.join(","));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const budgetYearOptions = useMemo(() => {
    const years = new Set<string>();
    for (const tor of tors) {
      const year = String(tor.budgetYear || "").trim();
      if (/^25\d{2}$/.test(year)) years.add(year);
    }
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [tors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tors.filter((tor) => {
      const dept = torDepartment(tor, locale);
      const agency = torAgency(tor, locale);
      const title = torTitle(tor, locale);
      const matchesAgency =
        filters.agencies.length === 0 || filters.agencies.includes(tor.agencyId);
      const matchesCategory =
        filters.categories.length === 0 || filters.categories.includes(tor.category);
      const matchesSource =
        filters.sources.length === 0 ||
        filters.sources.some((source) => source === tor.sourceKind);
      const stage = listingStage(tor);
      const matchesLifecycle =
        filters.stages.length === 0 || filters.stages.includes(stage);
      const matchesBudgetYear =
        filters.budgetYears.length === 0 ||
        filters.budgetYears.includes(String(tor.budgetYear || ""));
      const matchesIntegrity =
        filters.integrities.length === 0 || filters.integrities.includes(tor.integrity);
      const matchesTeam =
        !vendor ||
        !filters.teamOnly ||
        (typeof tor.matchScore === "number" && tor.matchScore >= 80);
      const matchesQuery =
        !q ||
        title.toLowerCase().includes(q) ||
        agency.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q) ||
        tor.refId.toLowerCase().includes(q);

      return (
        matchesAgency &&
        matchesCategory &&
        matchesSource &&
        matchesLifecycle &&
        matchesBudgetYear &&
        matchesIntegrity &&
        matchesTeam &&
        matchesQuery
      );
    }).sort((a, b) => compareListings(a, b, filters.sort));
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

  function resetAll() {
    setQuery("");
    applyFilters(DEFAULT_FILTERS, "");
  }

  function goToPage(nextPage: number) {
    setPage(nextPage);
    window.requestAnimationFrame(() => {
      listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="flex flex-col gap-10">
      {showHeader ? (
        <PageHeader
          eyebrow={t("opportunitiesEyebrow")}
          title={vendor ? t("vendorCatalogTitle") : t("opportunitiesTitle")}
          description={
            vendor ? t("vendorCatalogDescription") : t("opportunitiesDescription")
          }
        />
      ) : null}

      <div className="grid items-start gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="flex items-end justify-between gap-4 lg:col-span-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-[1.2]">
          {t("listingsResultsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {filtered.length}
          </span>{" "}
          {t("of")} {tors.length} {t("results")}
        </p>
      </div>
      <div className="flex items-center gap-3 lg:col-span-2">
      <label className="relative isolate block min-w-0 flex-1 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]"
        />
        <span className="sr-only">{t("searchPlaceholder")}</span>
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder={t("searchPlaceholder")}
          className="relative h-10 rounded-full border-0 bg-transparent pl-11 text-foreground shadow-none ring-0 placeholder:text-[var(--palette-gray-600)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </label>
      <TorSort
        value={filters.sort}
        onChange={(sort) => applyFilters({ ...filters, sort })}
        className="w-44 shrink-0 border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] sm:w-52"
      />
      </div>

      <aside className="self-start lg:sticky lg:top-6 lg:max-h-[calc(100dvh-72px-3rem)] lg:overflow-y-auto">
        <Surface className="bg-surface p-5 ring-transparent md:p-6">
          <TorFilters
            value={filters}
            onChange={applyFilters}
            onClear={resetAll}
            budgetYears={budgetYearOptions}
            showMatchFilter={vendor}
          />
        </Surface>
      </aside>

      <MonitorSection
        className="min-w-0"
        surfaceClassName="bg-transparent p-0 ring-0 shadow-none md:p-0"
      >
        <div className="flex flex-col gap-4">
        {isPending || isFetching ? <TorFetchStatus /> : null}

        {(isPending || isFetching) && tors.length === 0 ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-lg bg-background/60"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <p className="text-sm font-medium">{t("emptyFilters")}</p>
            <Button type="button" variant="orange" onClick={resetAll}>
              {t("resetFilters")}
            </Button>
          </div>
        ) : (
          <>
            <div
              ref={listTopRef}
              className="grid scroll-mt-6 gap-3 sm:grid-cols-2 xl:grid-cols-3"
            >
              {paginated.map((tor) => (
                <ListingFrostCard key={tor.id} tor={tor} />
              ))}
            </div>
            {totalRows > PAGE_SIZE ? (
              <nav
                aria-label={t("pageLabel")}
                className="flex flex-col gap-3 border-t border-border/60 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
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
                      variant={pageNumber === currentPage ? "orange" : "outline"}
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
          </>
        )}
        </div>
      </MonitorSection>
      </div>
    </div>
  );
}
