"use client";


import { ShellContent } from "@/components/layout/shell-content";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useLocale } from "@/components/providers/locale-provider";
import { ListingFrostCard } from "@/components/tor/listing-frost-card";
import { Button } from "@/components/ui/button";
import { FrostCard } from "@/components/ui/frost-card";
import { routes } from "@/config/routes";
import {
  api,
  fetchTorsForQuery,
  setMatchBadResult,
  setMatchDismissed,
  storedMatchScore as matchScore,
  storedMatchTorId as matchTorId,
  type StoredMatch,
} from "@/lib/api";
import {
  fitScoreApplies,
  listingStage,
  MATCH_INBOX_MIN_PERCENT,
} from "@/lib/listing-stage";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import type { Tor } from "@/types/tor";

type InboxRow = { match: StoredMatch; tor: Tor };
type InboxFilter = "inbox" | "strong" | "closing" | "possible" | "dismissed";

const PAGE_SIZE = 8;
const INBOX_QUERY_KEY = ["tor-matches", "inbox"] as const;
const FILTERS: Array<{ id: InboxFilter; label: DictionaryKey }> = [
  { id: "inbox", label: "inboxFilterInbox" },
  { id: "strong", label: "inboxFilterStrong" },
  { id: "closing", label: "inboxFilterClosing" },
  { id: "possible", label: "inboxFilterPossible" },
  { id: "dismissed", label: "inboxFilterDismissed" },
];

function rowScore(row: InboxRow) {
  return matchScore(row.match.matchPercent);
}

function rowDismissed(row: InboxRow) {
  return Boolean(row.match.dismissedAt);
}

function compareInboxRows(a: InboxRow, b: InboxRow) {
  const aScore = rowScore(a);
  const bScore = rowScore(b);
  const aPriority =
    aScore + (listingStage(a.tor) === "closing" && aScore >= 70 ? 15 : 0);
  const bPriority =
    bScore + (listingStage(b.tor) === "closing" && bScore >= 70 ? 15 : 0);
  if (aPriority !== bPriority) return bPriority - aPriority;
  return (
    new Date(b.match.updatedAt || 0).getTime() -
    new Date(a.match.updatedAt || 0).getTime()
  );
}

function rowsForFilter(rows: InboxRow[], filter: InboxFilter) {
  return rows
    .filter((row) => {
      const score = rowScore(row);
      const dismissed = rowDismissed(row);
      if (filter === "dismissed") return dismissed;
      if (dismissed) return false;
      if (filter === "strong") return score >= 85;
      if (filter === "closing")
        return score >= 70 && listingStage(row.tor) === "closing";
      if (filter === "possible") return score >= 60 && score < 70;
      return score >= 70;
    })
    .sort(compareInboxRows);
}

async function fetchInboxRows(): Promise<InboxRow[]> {
  const [matches, tors] = await Promise.all([
    api<StoredMatch[]>("/tor-matches/mine"),
    fetchTorsForQuery(),
  ]);
  const byId = new Map(tors.map((tor) => [tor.id, tor]));
  return matches
    .map((match) => {
      const tor = byId.get(matchTorId(match.torId));
      return tor ? { match, tor } : null;
    })
    .filter((row): row is InboxRow => row !== null)
    .filter((row) => fitScoreApplies(row.tor))
    .filter((row) => rowScore(row) >= MATCH_INBOX_MIN_PERCENT)
    .sort(
      (a, b) =>
        matchScore(b.match.matchPercent) - matchScore(a.match.matchPercent),
    );
}

const frostButton =
  "border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]";

export function InboxView() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<InboxFilter>("inbox");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const inboxQuery = useQuery({
    queryKey: INBOX_QUERY_KEY,
    queryFn: fetchInboxRows,
    staleTime: 60_000,
  });

  const rows = inboxQuery.data ?? [];
  // isPending = first load with no cache. Background refetch keeps the list visible.
  const loading = inboxQuery.isPending;
  const errorStatus =
    inboxQuery.error &&
    typeof inboxQuery.error === "object" &&
    "status" in inboxQuery.error
      ? Number((inboxQuery.error as { status?: number }).status)
      : undefined;
  const error: "auth" | "load" | null = inboxQuery.isError
    ? errorStatus === 401
      ? "auth"
      : "load"
    : null;

  const filtered = rowsForFilter(rows, filter);
  const topPicks = filter === "inbox" ? filtered.slice(0, 5) : [];
  const review = filter === "inbox" ? filtered.slice(5) : filtered;
  const shownReview = review.slice(0, visible);

  async function dismiss(row: InboxRow) {
    const nextDismissed = !rowDismissed(row);
    const previous = queryClient.getQueryData<InboxRow[]>(INBOX_QUERY_KEY);

    queryClient.setQueryData<InboxRow[]>(INBOX_QUERY_KEY, (current = []) =>
      current.map((item) =>
        item.match._id === row.match._id
          ? {
              ...item,
              match: {
                ...item.match,
                dismissedAt: nextDismissed ? new Date().toISOString() : null,
              },
            }
          : item,
      ),
    );

    try {
      await setMatchDismissed(row.match._id, nextDismissed);
      void queryClient.invalidateQueries({ queryKey: ["tor-matches", "mine"] });
    } catch {
      if (previous) queryClient.setQueryData(INBOX_QUERY_KEY, previous);
    }
  }

  async function markBadResult(row: InboxRow) {
    const previous = queryClient.getQueryData<InboxRow[]>(INBOX_QUERY_KEY);
    const now = new Date().toISOString();

    queryClient.setQueryData<InboxRow[]>(INBOX_QUERY_KEY, (current = []) =>
      current.map((item) =>
        item.match._id === row.match._id
          ? {
              ...item,
              match: {
                ...item.match,
                badResultAt: now,
                dismissedAt: now,
              },
            }
          : item,
      ),
    );

    try {
      await setMatchBadResult(row.match._id);
      void queryClient.invalidateQueries({ queryKey: ["tor-matches", "mine"] });
    } catch {
      if (previous) queryClient.setQueryData(INBOX_QUERY_KEY, previous);
    }
  }

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden text-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={
            {
              background: [
                "radial-gradient(ellipse 42% 70% at 4% 58%, var(--palette-orange-300), transparent)",
                "radial-gradient(ellipse 36% 60% at 24% 42%, var(--palette-yellow-300), transparent)",
                "radial-gradient(ellipse 40% 64% at 72% 40%, var(--palette-blue-300), transparent)",
                "radial-gradient(ellipse 42% 70% at 96% 72%, var(--palette-red-200), transparent)",
                "radial-gradient(ellipse 42% 70% at 8% 96%, var(--palette-teal-300), transparent)",
              ].join(","),
            } as CSSProperties
          }
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--palette-black)_14%,transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,white_40%,transparent)]"
          style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.55)" }}
        />
        <ShellContent>
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(144px+2rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3rem)]">
          <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              {t("inboxTitle")}
            </h1>
            <p className="mt-5 text-base leading-[1.7] text-muted-foreground md:text-lg">
              {t("inboxDescription")}
            </p>
          </div>
        </div>
        </ShellContent>
      </section>

      <ShellContent>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("matchesLoading")}</p>
        ) : null}
        {error === "load" ? (
          <p className="text-sm text-muted-foreground">{t("matchesError")}</p>
        ) : null}
        {!loading && error === "auth" ? (
          <FrostCard className="p-5 md:p-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("matchesEmpty")}
            </p>
            <Button asChild className={`${frostButton} mt-4`}>
              <Link href={routes.login}>{t("signUpLogin")}</Link>
            </Button>
          </FrostCard>
        ) : null}
        {!loading && !error && rows.length === 0 ? (
          <FrostCard className="p-5 md:p-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("matchesEmpty")}
            </p>
            <Button asChild className={`${frostButton} mt-4`}>
              <Link href={routes.app.profile}>{t("navProfile")}</Link>
            </Button>
          </FrostCard>
        ) : null}
        {!loading && !error && rows.length ? (
          <div className="flex flex-wrap gap-2 pb-6">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFilter(item.id);
                  setVisible(PAGE_SIZE);
                }}
                className={
                  filter === item.id
                    ? `${frostButton} h-8 rounded-full px-3 text-sm font-medium`
                    : "h-8 rounded-full bg-transparent px-3 text-sm font-medium text-muted-foreground ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_70%,transparent)]"
                }
              >
                {t(item.label)}
              </button>
            ))}
          </div>
        ) : null}
        {!loading && !error && rows.length && filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("inboxFilterEmpty")}
          </p>
        ) : null}
        {topPicks.length ? (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              {t("inboxTopPicks")}
            </h2>
            <InboxGrid
              rows={topPicks}
              onDismiss={dismiss}
              onBadResult={markBadResult}
            />
          </section>
        ) : null}
        {shownReview.length ? (
          <section
            className={topPicks.length ? "space-y-4 pt-10" : "space-y-4"}
          >
            {filter === "inbox" ? (
              <h2 className="text-xl font-semibold tracking-tight">
                {t("inboxNeedsReview")}
              </h2>
            ) : null}
            <InboxGrid
              rows={shownReview}
              onDismiss={dismiss}
              onBadResult={markBadResult}
            />
            {visible < review.length ? (
              <button
                type="button"
                onClick={() => setVisible((count) => count + PAGE_SIZE)}
                className={`${frostButton} h-10 rounded-full px-4 text-sm font-medium`}
              >
                {t("inboxLoadMore")}
              </button>
            ) : null}
          </section>
        ) : null}
      </div>
      </ShellContent>
    </div>
  );
}

function InboxGrid({
  rows,
  onDismiss,
  onBadResult,
}: {
  rows: InboxRow[];
  onDismiss: (row: InboxRow) => void;
  onBadResult: (row: InboxRow) => void;
}) {
  return (
    <div className="grid items-stretch gap-4 overflow-visible pt-3 pr-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <ListingFrostCard
          key={row.match._id}
          tor={{ ...row.tor, matchScore: rowScore(row) }}
          matchInsight={row.match.matchReason}
          dismissed={rowDismissed(row)}
          returnTo="matches"
          onDismiss={() => onDismiss(row)}
          onBadResult={() => onBadResult(row)}
        />
      ))}
    </div>
  );
}
