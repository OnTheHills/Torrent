"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ChevronFirstIcon,
  ChevronLastIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  AdminBody,
  AdminButton,
  AdminHero,
  AdminStatus,
  ReasonField,
  useAdminQuery,
} from "@/components/admin/admin-ui";
import {
  DEFAULT_RECORDS_FILTERS,
  RECORDS_SOURCES,
  RecordsFilters,
  RecordsSortSelect,
  type RecordsFilterState,
} from "@/components/admin/records-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { routes } from "@/config/routes";
import { formatBudgetCompact } from "@/data/mock";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;
const PAGE_WINDOW_SIZE = 5;

type Row = {
  id: string;
  refId?: string;
  title: string;
  source?: string;
  department?: string;
  budgetThb: number;
  confidence: number;
  reviewStatus: string;
  hidden: boolean;
  integrityStatus?: string;
};

type Payload = {
  total: number;
  items: Row[];
  budgetYears?: string[];
};

const SOURCE_LABEL = Object.fromEntries(
  RECORDS_SOURCES.map((source) => [source.value, source.label]),
) as Record<string, string>;

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
  if (filters.integrity.length) {
    params.set("integrity", filters.integrity.join(","));
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
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const listTopRef = useRef<HTMLDivElement>(null);

  const path = useMemo(
    () => buildRecordsPath(query, filters, page),
    [query, filters, page],
  );
  const { data, error, loading, reload } = useAdminQuery<Payload>(path);
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
        <div
          ref={listTopRef}
          className="grid items-start gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]"
        >
          <div className="flex items-end justify-between gap-4 lg:col-span-2">
            <h2 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-[1.2]">
              Catalog
            </h2>
            <p className="text-sm text-muted-foreground">
              {loading && !data ? (
                "Loading…"
              ) : (
                <>
                  <span className="font-semibold tabular-nums text-foreground">
                    {total.toLocaleString("en-US")}
                  </span>{" "}
                  match this filter
                </>
              )}
            </p>
          </div>

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
                </div>
              </Surface>
              {message ? (
                <p className="mt-2 text-sm text-muted-foreground">{message}</p>
              ) : null}
            </div>
          ) : message ? (
            <p className="text-sm text-muted-foreground lg:col-span-2">{message}</p>
          ) : null}

          <aside className="self-start lg:sticky lg:top-6 lg:max-h-[calc(100dvh-72px-3rem)] lg:overflow-y-auto">
            <Surface className="bg-surface p-5 ring-transparent md:p-6">
              <RecordsFilters
                value={filters}
                onChange={applyFilters}
                onClear={() => applyFilters(DEFAULT_RECORDS_FILTERS)}
                budgetYears={data?.budgetYears ?? []}
              />
            </Surface>
          </aside>

          <div className="min-w-0 space-y-6">
            <AdminStatus loading={loading && !data} error={error} />
            <Surface className="overflow-hidden bg-surface p-0 ring-transparent">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-12" />
                    <col />
                    <col className="w-[6.5rem]" />
                    <col className="w-[6.5rem]" />
                    <col className="w-[6.5rem]" />
                  </colgroup>
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-[color-mix(in_srgb,var(--palette-gray-300)_35%,transparent)]">
                      <th className="px-4 py-3" aria-hidden />
                      <th className="px-3 py-3 font-medium">Title</th>
                      <th className="px-3 py-3 font-medium">Source</th>
                      <th className="px-3 py-3 text-right font-medium">Budget</th>
                      <th className="px-4 py-3 text-right font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.length ? (
                      data.items.map((row) => {
                        const checked = selected.includes(row.id);
                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              "border-t border-[color-mix(in_srgb,var(--palette-gray-300)_28%,transparent)] transition-colors",
                              checked
                                ? "bg-[color-mix(in_srgb,var(--palette-teal-100)_55%,transparent)]"
                                : "hover:bg-[color-mix(in_srgb,white_45%,transparent)]",
                            )}
                          >
                            <td className="px-4 py-3 align-middle">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(row.id)}
                                aria-label={`Select ${row.title}`}
                                className="size-4 cursor-pointer rounded-[4px] border-0 bg-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_55%,transparent)] accent-[var(--palette-teal-500)]"
                              />
                            </td>
                            <td className="px-3 py-3 align-middle">
                              <Link
                                href={routes.admin.tor(row.id)}
                                className="line-clamp-2 font-medium leading-snug hover:underline"
                              >
                                {row.title}
                              </Link>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {[
                                  row.hidden ? "Hidden" : null,
                                  row.integrityStatus === "flagged" ||
                                  row.integrityStatus === "confirmed"
                                    ? "Watch out"
                                    : null,
                                  row.department || row.refId || null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </p>
                            </td>
                            <td className="truncate px-3 py-3 align-middle text-muted-foreground">
                              {sourceLabel(row.source)}
                            </td>
                            <td className="px-3 py-3 align-middle text-right tabular-nums">
                              {formatBudgetCompact(row.budgetThb)}
                            </td>
                            <td className="px-4 py-3 align-middle text-right tabular-nums">
                              {row.confidence}%
                            </td>
                          </tr>
                        );
                      })
                    ) : data && !loading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          No records match these filters.
                        </td>
                      </tr>
                    ) : null}
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
        </div>
      </AdminBody>
    </div>
  );
}
