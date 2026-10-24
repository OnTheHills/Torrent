"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ChevronFirstIcon,
  ChevronLastIcon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  AdminBody,
  AdminButton,
  AdminHero,
  AdminStatus,
  useAdminQuery,
} from "@/components/admin/admin-ui";
import {
  DEFAULT_REVIEW_FILTERS,
  ReviewFilters,
  ReviewSortSelect,
  type ReviewFilterState,
} from "@/components/admin/review-filters";
import {
  ReviewFrostCard,
  type ReviewCardItem,
} from "@/components/admin/review-frost-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const RESCORE_REASON = "Operator scored open review catalog";

type ReviewPayload = {
  total: number;
  items: ReviewCardItem[];
  budgetYears?: string[];
};

type ScoreUpdatePhase = "idle" | "updating" | "done";

const PAGE_SIZE = 12;
const PAGE_WINDOW_SIZE = 5;

/** App Store–style circular download ring with stop / check center. */
function ScoreUpdateRing({
  progress,
  phase,
}: {
  progress: number;
  phase: "updating" | "done";
}) {
  const size = 22;
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = phase === "done" ? 1 : Math.min(0.96, Math.max(0.04, progress));
  const offset = circumference * (1 - pct);

  return (
    <span className="relative inline-flex size-[22px] shrink-0 items-center justify-center" aria-hidden>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.22}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-200 ease-out motion-reduce:transition-none"
        />
      </svg>
      {phase === "done" ? (
        <HugeiconsIcon
          icon={Tick02Icon}
          strokeWidth={2.5}
          className="absolute size-3"
        />
      ) : (
        <span className="absolute size-1.5 rounded-[1.5px] bg-current" />
      )}
    </span>
  );
}

function buildReviewPath(
  query: string,
  filters: ReviewFilterState,
  page: number,
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (filters.sources.length) params.set("source", filters.sources.join(","));
  if (filters.budgetYears.length) params.set("year", filters.budgetYears.join(","));
  if (filters.bands.length) params.set("band", filters.bands.join(","));
  if (filters.stages.length) params.set("stage", filters.stages.join(","));
  params.set("sort", filters.sort);
  params.set("limit", String(PAGE_SIZE));
  params.set("skip", String((page - 1) * PAGE_SIZE));
  return `/api/admin/review?${params.toString()}`;
}

export function ReviewView() {
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ReviewFilterState>(DEFAULT_REVIEW_FILTERS);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [updatePhase, setUpdatePhase] = useState<ScoreUpdatePhase>("idle");
  const [updateProgress, setUpdateProgress] = useState(0);
  const listTopRef = useRef<HTMLDivElement>(null);
  const doneResetRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busy = updatePhase === "updating";

  const path = useMemo(
    () => buildReviewPath(query, filters, page),
    [query, filters, page],
  );
  const { data, error, loading, reload } = useAdminQuery<ReviewPayload>(path);

  useEffect(() => {
    if (updatePhase !== "updating") return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      // Ease toward ~92% while the request is in flight (no server progress stream).
      setUpdateProgress(0.06 + 0.86 * (1 - Math.exp(-elapsed / 14)));
    }, 120);
    return () => window.clearInterval(timer);
  }, [updatePhase]);

  useEffect(() => {
    return () => {
      if (doneResetRef.current != null) window.clearTimeout(doneResetRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function applyFilters(next: ReviewFilterState) {
    setFilters(next);
    setPage(1);
  }

  function applyQuery(next: string) {
    setQuery(next);
    setPage(1);
  }

  function cancelRescore() {
    abortRef.current?.abort();
  }

  async function rescore() {
    if (updatePhase === "updating") {
      cancelRescore();
      return;
    }
    if (updatePhase !== "idle") return;

    const controller = new AbortController();
    abortRef.current = controller;
    setUpdatePhase("updating");
    setUpdateProgress(0.06);
    setMessage(null);
    try {
      const result = await api<{
        scored: number;
        vertexScored?: number;
        skippedExpired?: number;
      }>("/api/admin/review/rescore", {
        method: "POST",
        body: JSON.stringify({ reason: RESCORE_REASON }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setUpdateProgress(1);
      setUpdatePhase("done");
      const scored = result.scored.toLocaleString("en-US");
      const vertex = (result.vertexScored ?? 0).toLocaleString("en-US");
      const closedOrPast = (result.skippedExpired ?? 0).toLocaleString("en-US");
      setMessage(
        `${scored} scored · ${vertex} Vertex AI · ${closedOrPast} closed or past deadline`,
      );
      await reload();
      if (doneResetRef.current != null) window.clearTimeout(doneResetRef.current);
      doneResetRef.current = window.setTimeout(() => {
        setUpdatePhase("idle");
        setUpdateProgress(0);
        doneResetRef.current = null;
      }, 1100);
    } catch (err) {
      const aborted =
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === "AbortError") ||
        (err instanceof Error && err.name === "AbortError");
      setUpdatePhase("idle");
      setUpdateProgress(0);
      setMessage(aborted ? "Update cancelled." : err instanceof Error ? err.message : "Rescore failed");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
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
        title="Review queue"
        description="Open and upcoming records that need a human look — Lookup for a quick check, Must check when fields look incomplete. Fresh TORs are scored on every sync (rules first, then Vertex AI); update scores manually only if confidence looks wrong."
        actions={
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <AdminButton
                tone={
                  updatePhase === "done"
                    ? "green"
                    : updatePhase === "updating"
                      ? "neutral"
                      : "teal"
                }
                onClick={rescore}
                aria-busy={busy}
                aria-disabled={updatePhase === "done"}
                aria-label={
                  updatePhase === "updating"
                    ? "Cancel score update"
                    : "Update scores now"
                }
                title={
                  updatePhase === "updating" ? "Click to cancel" : undefined
                }
                aria-live="polite"
                className={cn(
                  "h-9 gap-2.5 px-4 text-sm transition-[transform,background,color] duration-200 ease-out motion-reduce:transition-none",
                  updatePhase === "idle" &&
                    "hover:-translate-y-0.5 motion-reduce:hover:transform-none",
                  updatePhase === "done" && "pointer-events-none",
                )}
              >
                {updatePhase === "idle" ? (
                  "Update scores now"
                ) : (
                  <>
                    <ScoreUpdateRing
                      progress={updateProgress}
                      phase={updatePhase === "done" ? "done" : "updating"}
                    />
                    <span className="min-w-[6.5rem] text-left tabular-nums">
                      {updatePhase === "done"
                        ? "Updated"
                        : `Updating ${Math.round(updateProgress * 100)}%`}
                    </span>
                  </>
                )}
              </AdminButton>
              {message ? (
                <p className="text-sm text-hero-muted">{message}</p>
              ) : null}
            </div>
          </>
        }
      />
      <AdminBody className="max-w-screen-2xl space-y-10 md:space-y-12">
        <div ref={listTopRef} className="grid items-start gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="flex items-end justify-between gap-4 lg:col-span-2">
              <h2 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-[1.2]">
                Needs review
              </h2>
              <p className="text-sm text-muted-foreground">
                {loading && !data ? (
                  "Loading…"
                ) : (
                  <>
                    <span className="font-semibold tabular-nums text-foreground">
                      {total.toLocaleString("en-US")}
                    </span>{" "}
                    open / upcoming
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
                    placeholder="Search title or ref"
                    className="relative h-10 rounded-full border-0 bg-transparent pr-4 pl-11 shadow-none ring-0 focus-visible:ring-0"
                  />
                </form>
                <ReviewSortSelect
                  value={filters.sort}
                  onChange={(sort) => applyFilters({ ...filters, sort })}
                  className="w-44 shrink-0 sm:w-52"
                />
            </div>

            <aside className="self-start lg:sticky lg:top-6 lg:max-h-[calc(100dvh-72px-3rem)] lg:overflow-y-auto">
              <Surface className="bg-surface p-5 ring-transparent md:p-6">
                <ReviewFilters
                  value={filters}
                  onChange={applyFilters}
                  onClear={() => applyFilters(DEFAULT_REVIEW_FILTERS)}
                  budgetYears={data?.budgetYears ?? []}
                />
              </Surface>
            </aside>

            <div className="min-w-0 space-y-6">
              <AdminStatus loading={loading && !data} error={error} />
              {data && !data.items.length ? (
                <p className="text-sm text-muted-foreground">
                  Queue is empty for these filters.
                </p>
              ) : null}
              <div className="grid scroll-mt-6 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data?.items.map((item) => (
                  <ReviewFrostCard key={item.id} item={item} />
                ))}
              </div>
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
