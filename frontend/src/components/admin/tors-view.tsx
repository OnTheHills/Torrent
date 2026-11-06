"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BadgePercentIcon,
  BankIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  Invisible,
  Search01Icon,
  SourceCodeIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  AdminBody,
  AdminButton,
  AdminHero,
  AdminStatus,
  ReasonField,
  frostButton,
  useAdminQuery,
} from "@/components/admin/admin-ui";
import {
  DEFAULT_RECORDS_FILTERS,
  RECORDS_SOURCES,
  RecordsFilters,
  RecordsSortSelect,
  type RecordsFilterState,
} from "@/components/admin/records-filters";
import {
  bandLabel,
  bandLabelClassName,
  bandTint,
  effectiveBand,
} from "@/components/admin/review-band";
import {
  FilterCountPill,
  FilterPanelAside,
  FilterPanelLayout,
} from "@/components/filters/filter-panel";
import { StageBadge } from "@/components/tor/listing-badges";
import {
  FrostCheckbox,
  frostSelectedItem,
} from "@/components/tor/tor-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { routes } from "@/config/routes";
import { formatBudgetCompact } from "@/data/mock";
import { api } from "@/lib/api";
import { listingStage } from "@/lib/listing-stage";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;
const PAGE_WINDOW_SIZE = 5;
const TABLE_SKELETON_ROWS = 8;

type Row = {
  id: string;
  refId?: string;
  title: string;
  source?: string;
  department?: string;
  status?: string;
  deadline?: string;
  budgetThb: number;
  confidence: number;
  reviewStatus: string;
  hidden: boolean;
  integrityStatus?: string;
};

function rowStage(row: Row) {
  return listingStage({
    lifecycle: row.status || "published",
    deadline: row.deadline
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
          new Date(row.deadline),
        )
      : undefined,
    sourceKind: row.source === "SME-GP" ? "sme-gp" : undefined,
  });
}

type Payload = {
  total: number;
  items: Row[];
  budgetYears?: string[];
};

const SOURCE_LABEL: Record<string, string> = {
  ...Object.fromEntries(
    RECORDS_SOURCES.map((source) => [source.value, source.label]),
  ),
  "EGP-PROCESS5": "e-GP Process5",
};

function sourceLabel(source?: string) {
  if (!source) return "—";
  return SOURCE_LABEL[source] ?? source;
}

function buildRecordsPath(
  query: string,
  filters: RecordsFilterState,
  page: number,
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (filters.sources.length) params.set("source", filters.sources.join(","));
  if (filters.budgetYears.length) params.set("year", filters.budgetYears.join(","));
  if (filters.stages.length) params.set("stage", filters.stages.join(","));
  if (filters.reviews.length) params.set("review", filters.reviews.join(","));
  if (filters.budgetAvailability.length) {
    params.set("budget", filters.budgetAvailability.join(","));
  }
  if (filters.watchOut.length) {
    params.set("integrity", filters.watchOut.join(","));
  }
  if (filters.visibility.length) {
    params.set("visibility", filters.visibility.join(","));
  }
  params.set("sort", filters.sort);
  params.set("limit", String(PAGE_SIZE));
  params.set("skip", String((page - 1) * PAGE_SIZE));
  return `/api/admin/tors?${params.toString()}`;
}

export function TorsView() {
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<RecordsFilterState>(DEFAULT_RECORDS_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const listTopRef = useRef<HTMLDivElement>(null);

  function stopSelecting() {
    setSelecting(false);
    setSelected([]);
  }

  const path = useMemo(
    () => buildRecordsPath(query, filters, page),
    [query, filters, page],
  );
  const { data, error, loading, fetching, isPlaceholderData, reload } =
    useAdminQuery<Payload>(path);
  const showTableSkeleton = loading || isPlaceholderData;

  function applyFilters(next: RecordsFilterState) {
    setFilters(next);
    setPage(1);
    setSelected([]);
  }

  function applyQuery(next: string) {
    setQuery(next);
    setPage(1);
    setSelected([]);
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function bulk(action: "hide" | "restore" | "review") {
    setMessage(null);
    setBusy(true);
    try {
      const result = await api<{ modified: number }>("/api/admin/tors/bulk", {
        method: "POST",
        body: JSON.stringify({ ids: selected, action, reason }),
      });
      setMessage(`${action} updated ${result.modified} records.`);
      setSelected([]);
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setBusy(false);
    }
  }

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, total);
  const pageWindowStart =
    Math.floor((safePage - 1) / PAGE_WINDOW_SIZE) * PAGE_WINDOW_SIZE + 1;
  const pageWindowEnd = Math.min(pageWindowStart + PAGE_WINDOW_SIZE - 1, pageCount);
  const pages = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, index) => pageWindowStart + index,
  );

  function goToPage(next: number) {
    setPage(next);
    window.requestAnimationFrame(() => {
      listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div>
      <AdminHero
        className="max-w-screen-2xl"
        title="Records"
        description="Search every stored TOR, including hidden ones. Hiding keeps the row and its history, and removes it from the public catalog."
      />
      <AdminBody className="max-w-screen-2xl space-y-10 md:space-y-12">
        <FilterPanelLayout ref={listTopRef}>
          <div className="flex items-center gap-3 lg:col-span-2">
            <form
              className="relative isolate min-w-0 flex-1 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150"
              onSubmit={(event) => {
                event.preventDefault();
                applyQuery(draftQuery.trim());
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]"
              />
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={1.75}
                className="pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Search title, department, or ref"
                className="relative h-10 rounded-full border-0 bg-transparent pr-4 pl-11 shadow-none ring-0 focus-visible:ring-0"
              />
            </form>
            <RecordsSortSelect
              value={filters.sort}
              onChange={(sort) => applyFilters({ ...filters, sort })}
              className="w-44 shrink-0 sm:w-52"
            />
            <Button
              type="button"
              size="lg"
              className={cn(
                "h-10 w-[5.25rem] shrink-0 rounded-full px-4",
                frostButton,
              )}
              aria-pressed={selecting}
              onClick={() => {
                if (selecting) stopSelecting();
                else setSelecting(true);
              }}
            >
              {selecting ? "Done" : "Select"}
            </Button>
            <FilterCountPill
              className={fetching ? "opacity-60" : undefined}
              aria-live="polite"
            >
              {loading && !data ? (
                "Loading…"
              ) : (
                <>
                  <span className="font-semibold tabular-nums">
                    {total.toLocaleString("en-US")}
                  </span>
                  <span className="ml-1 opacity-80">match this filter</span>
                </>
              )}
            </FilterCountPill>
          </div>

          {selected.length > 0 ? (
            <div className="lg:col-span-2">
              <Surface className="flex flex-col gap-3 bg-surface p-4 ring-transparent sm:flex-row sm:items-end sm:gap-4 md:p-5">
                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-sm font-medium tabular-nums">
                    {selected.length} selected
                  </p>
                  <ReasonField value={reason} onChange={setReason} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminButton
                    disabled={busy || !reason.trim()}
                    onClick={() => bulk("hide")}
                  >
                    Hide
                  </AdminButton>
                  <AdminButton
                    disabled={busy || !reason.trim()}
                    onClick={() => bulk("restore")}
                  >
                    Restore
                  </AdminButton>
                  <AdminButton
                    tone="teal"
                    disabled={busy || !reason.trim()}
                    onClick={() => bulk("review")}
                  >
                    Send to review
                  </AdminButton>
                  <AdminButton
                    tone="glass"
                    disabled={busy}
                    onClick={() => setSelected([])}
                  >
                    Clear selection
                  </AdminButton>
                  <AdminButton
                    tone="glass"
                    disabled={busy}
                    onClick={stopSelecting}
                  >
                    Done
                  </AdminButton>
                </div>
              </Surface>
              {message ? (
                <p className="mt-2 text-sm text-muted-foreground">{message}</p>
              ) : null}
            </div>
          ) : message ? (
            <p className="text-sm text-muted-foreground lg:col-span-2">{message}</p>
          ) : null}

          <FilterPanelAside>
            <RecordsFilters
              value={filters}
              onChange={applyFilters}
              onClear={() => applyFilters(DEFAULT_RECORDS_FILTERS)}
              budgetYears={data?.budgetYears ?? []}
            />
          </FilterPanelAside>

          <div className="min-w-0 space-y-6">
            {error ? <AdminStatus error={error} /> : null}
            <Surface
              className="overflow-hidden bg-surface p-0 ring-transparent"
              aria-busy={showTableSkeleton}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    {selecting ? <col className="w-12" /> : null}
                    <col />
                    <col className="w-[6.5rem]" />
                    <col className="w-[9.5rem]" />
                    <col className="w-[10.75rem]" />
                  </colgroup>
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-[color-mix(in_srgb,var(--palette-gray-300)_35%,transparent)]">
                      {selecting ? <th className="px-4 py-3" aria-hidden /> : null}
                      <th className="px-3 pl-4 py-3 font-medium">Title</th>
                      <th className="py-3 pr-6 pl-3 text-right font-medium">Budget</th>
                      <th className="py-3 pr-1.5 pl-6 font-medium">Status</th>
                      <th className="py-3 pr-3 pl-1.5 font-medium">Extraction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showTableSkeleton
                      ? Array.from({ length: TABLE_SKELETON_ROWS }, (_, index) => (
                          <tr
                            key={`skeleton-${index}`}
                            className="border-t border-[color-mix(in_srgb,var(--palette-gray-300)_28%,transparent)]"
                          >
                            {selecting ? (
                              <td className="px-4 py-3 align-middle">
                                <Skeleton className="size-4 rounded-[5px]" />
                              </td>
                            ) : null}
                            <td className="px-3 pl-4 py-3 align-middle">
                              <Skeleton className="h-4 w-[88%]" />
                              <div className="mt-2 flex items-center gap-2">
                                <Skeleton className="h-3 w-14" />
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-3 w-36" />
                              </div>
                            </td>
                            <td className="py-3 pr-6 pl-3 align-middle">
                              <Skeleton className="ml-auto h-3.5 w-14" />
                            </td>
                            <td className="py-3 pr-1.5 pl-6 align-middle">
                              <Skeleton className="h-6 w-[5.5rem] rounded-full" />
                            </td>
                            <td className="py-3 pr-3 pl-1.5 align-middle">
                              <Skeleton className="h-6 w-[9.5rem] rounded-full" />
                            </td>
                          </tr>
                        ))
                      : data?.items.length
                        ? data.items.map((row) => {
                            const checked = selected.includes(row.id);
                            const source = sourceLabel(row.source);
                            const department = row.department || row.refId || "";
                            const watchOut =
                              row.integrityStatus === "flagged" ||
                              row.integrityStatus === "confirmed";
                            const band = effectiveBand(
                              row.reviewStatus,
                              row.confidence,
                            );
                            return (
                              <tr
                                key={row.id}
                                className={cn(
                                  "border-t border-[color-mix(in_srgb,var(--palette-gray-300)_28%,transparent)] transition-colors",
                                  checked
                                    ? frostSelectedItem
                                    : "hover:bg-[color-mix(in_srgb,white_45%,transparent)]",
                                )}
                              >
                                {selecting ? (
                                  <td className="px-4 py-3 align-middle">
                                    <label className="inline-flex cursor-pointer items-center">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggle(row.id)}
                                        aria-label={`Select ${row.title}`}
                                        className="peer sr-only"
                                      />
                                      <FrostCheckbox checked={checked} />
                                    </label>
                                  </td>
                                ) : null}
                                <td className="px-3 pl-4 py-3 align-middle">
                                  <Link
                                    href={routes.admin.tor(row.id)}
                                    className="line-clamp-2 font-medium leading-snug hover:underline"
                                  >
                                    {row.title}
                                  </Link>
                                  <p className="mt-1.5 grid min-w-0 grid-cols-[max-content_calc(0.875rem+0.375rem+13ch)_minmax(0,1fr)] items-center gap-x-1 text-xs text-muted-foreground">
                                    {row.hidden ? (
                                      <span className="inline-flex items-center gap-1 font-medium text-[var(--palette-red-700)]">
                                        <HugeiconsIcon
                                          icon={Invisible}
                                          strokeWidth={1.75}
                                          className="size-3.5 shrink-0"
                                        />
                                        Hidden
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 font-medium text-[var(--palette-green-800)]">
                                        <HugeiconsIcon
                                          icon={ViewIcon}
                                          strokeWidth={1.75}
                                          className="size-3.5 shrink-0"
                                        />
                                        Visible
                                      </span>
                                    )}
                                    <span className="inline-flex min-w-0 items-center gap-1 pl-4">
                                      {source !== "—" ? (
                                        <>
                                          <HugeiconsIcon
                                            icon={SourceCodeIcon}
                                            strokeWidth={1.75}
                                            className="size-3.5 shrink-0"
                                          />
                                          <span className="truncate">{source}</span>
                                        </>
                                      ) : (
                                        <span className="truncate">—</span>
                                      )}
                                    </span>
                                    <span className="inline-flex min-w-0 items-center gap-x-1">
                                      {department ? (
                                        <span className="inline-flex min-w-0 items-center gap-1">
                                          <HugeiconsIcon
                                            icon={BankIcon}
                                            strokeWidth={1.75}
                                            className="size-3.5 shrink-0"
                                          />
                                          <span className="truncate">
                                            {department}
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="truncate">—</span>
                                      )}
                                      {watchOut ? (
                                        <span className="shrink-0 font-medium text-[var(--palette-orange-800)]">
                                          Watch out
                                        </span>
                                      ) : null}
                                    </span>
                                  </p>
                                </td>
                                <td className="py-3 pr-6 pl-3 align-middle text-right tabular-nums">
                                  {formatBudgetCompact(row.budgetThb)}
                                </td>
                                <td className="py-3 pr-1.5 pl-6 align-middle">
                                  <StageBadge stage={rowStage(row)} />
                                </td>
                                <td className="py-3 pr-3 pl-1.5 align-middle">
                                  <Badge
                                    variant="outline"
                                    className="inline-flex h-6 w-fit max-w-full items-center gap-1 border-0 px-2 pr-1 text-[0.625rem] text-foreground [&>svg]:size-3!"
                                    style={{
                                      backgroundColor: `color-mix(in srgb, ${bandTint(band)} 72%, transparent)`,
                                    }}
                                  >
                                    <HugeiconsIcon
                                      icon={BadgePercentIcon}
                                      strokeWidth={2}
                                    />
                                    <span className={bandLabelClassName}>
                                      {bandLabel(band)}
                                    </span>
                                    <span className="inline-flex h-4 min-w-[2.75rem] items-center justify-center rounded-full bg-white px-1.5 text-[0.625rem] font-semibold tabular-nums text-foreground">
                                      {row.confidence}%
                                    </span>
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })
                        : (
                          <tr>
                            <td
                              colSpan={selecting ? 5 : 4}
                              className="px-4 py-10 text-center text-muted-foreground"
                            >
                              No records match these filters.
                            </td>
                          </tr>
                        )}
                  </tbody>
                </table>
              </div>
            </Surface>
            {total > PAGE_SIZE ? (
              <nav
                aria-label="Page"
                className="flex flex-col gap-3 border-t border-border/60 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
              >
                <p>
                  {startIndex + 1}-{endIndex} of {total.toLocaleString("en-US")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="First page"
                    disabled={safePage === 1}
                    onClick={() => goToPage(1)}
                  >
                    <HugeiconsIcon icon={ChevronFirstIcon} strokeWidth={1.75} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Previous page"
                    disabled={safePage === 1}
                    onClick={() => goToPage(Math.max(1, safePage - 1))}
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.75} />
                  </Button>
                  {pages.map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      type="button"
                      variant={pageNumber === safePage ? "orange" : "outline"}
                      size="icon"
                      aria-label={`Page ${pageNumber}`}
                      aria-current={pageNumber === safePage ? "page" : undefined}
                      onClick={() => goToPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Next page"
                    disabled={safePage === pageCount}
                    onClick={() => goToPage(Math.min(pageCount, safePage + 1))}
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.75} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Last page"
                    disabled={safePage === pageCount}
                    onClick={() => goToPage(pageCount)}
                  >
                    <HugeiconsIcon icon={ChevronLastIcon} strokeWidth={1.75} />
                  </Button>
                </div>
              </nav>
            ) : null}
          </div>
        </FilterPanelLayout>
      </AdminBody>
    </div>
  );
}
