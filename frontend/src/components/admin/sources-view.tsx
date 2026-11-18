"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MonitorActivity } from "lucide-react";

import {
  AdminBody,
  AdminButton,
  AdminHero,
  AdminStatus,
  VerdictBadge,
  formatWhen,
  useAdminQuery,
} from "@/components/admin/admin-ui";
import { MonitorSection } from "@/components/monitor/monitor-section";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const RUN_PAGE_SIZE = 10;
const RUN_PAGE_WINDOW = 5;

function GlassPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="liquid-glass-card liquid-glass-card-static liquid-glass-card-clear rounded-2xl p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

type Run = {
  _id: string;
  sourceKey: string;
  trigger?: "manual" | "auto" | "startup";
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  fetched?: number;
  matched?: number;
  createdCount?: number;
  updatedCount?: number;
  error?: string;
  triggeredByEmail?: string;
  summary?: { source?: string; fetched?: number }[];
};

type SourcesPayload = {
  sources: {
    key: string;
    label: string;
    source: string;
    count: number;
    verdict: string;
    lastRun: Run | null;
  }[];
  runs: Run[];
};

const STATUS_CHECK_MS = 60 * 60_000;

function latestSync(runs: Run[]) {
  return runs.reduce<Run | null>((latest, run) => {
    if (!latest) return run;
    const at = new Date(run.finishedAt || run.startedAt).getTime();
    const latestAt = new Date(latest.finishedAt || latest.startedAt).getTime();
    return at > latestAt ? run : latest;
  }, null);
}

// Same rules as the feed verdict, minus staleness: a past run is judged on its own result.
function runVerdict(run: Run) {
  if (run.status === "failed") return "red";
  if (run.status !== "success") return "yellow";
  if (run.sourceKey !== "smeAnnouncements" && run.fetched === 0) return "red";
  return "green";
}

function downFeeds(run: Run, sources: SourcesPayload["sources"]) {
  if (run.sourceKey !== "all" || runVerdict(run) !== "red") return [];
  const rows = Array.isArray(run.summary) ? run.summary : [];
  if (run.status === "failed" && rows.length === 0) return sources;
  return sources.filter((source) => {
    const row = rows.find((item) => item?.source === source.source);
    if (!row) return run.status === "failed";
    return source.key !== "smeAnnouncements" && row.fetched === 0;
  });
}

function tintFor(key: string, amount: number) {
  return `color-mix(in srgb, ${SOURCE_TINT[key] ?? "var(--palette-gray-200)"} ${amount}%, transparent)`;
}

function runSource(run: Run, labels: Map<string, string>) {
  if (run.sourceKey === "all") return "All feeds";
  return labels.get(run.sourceKey) ?? run.sourceKey;
}

function runBy(run: Run) {
  if (run.trigger === "auto" || run.trigger === "startup") return "Scheduler";
  return run.triggeredByEmail || "—";
}

function count(value?: number) {
  return typeof value === "number" ? value.toLocaleString("en-US") : "—";
}

const SYNC_PATH: Record<string, string> = {
  dataGo: "/api/sync/data-go",
  bmaEgp2: "/api/sync/bma-egp2",
  egpRss: "/api/sync/egp-rss",
  smeAnnouncements: "/api/sync/sme-announcements",
  all: "/api/sync/all",
};

const SOURCE_TINT: Record<string, string> = {
  dataGo: "var(--palette-blue-200)",
  bmaEgp2: "var(--palette-teal-200)",
  egpRss: "var(--palette-orange-200)",
  smeAnnouncements: "var(--palette-purple-200)",
};

export function SourcesView() {
  const { data, error, loading, reload } = useAdminQuery<SourcesPayload>("/api/admin/sources");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [runPage, setRunPage] = useState(1);
  const busyRef = useRef(busy);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (busyRef.current !== null) return;
      void reload({ silent: true });
    }, STATUS_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [reload]);

  async function sync(key: string) {
    setBusy(key);
    setMessage(null);
    try {
      await api(SYNC_PATH[key], { method: "POST" });
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

  const lastSync = data ? latestSync(data.runs) : null;
  const sourceLabels = new Map(data?.sources.map((source) => [source.key, source.label]) ?? []);
  const runCount = data?.runs.length ?? 0;
  const runPageCount = Math.max(1, Math.ceil(runCount / RUN_PAGE_SIZE));
  const safeRunPage = Math.min(runPage, runPageCount);
  const runPageStart =
    Math.floor((safeRunPage - 1) / RUN_PAGE_WINDOW) * RUN_PAGE_WINDOW + 1;
  const runPageEnd = Math.min(runPageStart + RUN_PAGE_WINDOW - 1, runPageCount);
  const runPages = Array.from(
    { length: runPageEnd - runPageStart + 1 },
    (_, index) => runPageStart + index,
  );
  const pagedRuns = data
    ? data.runs.slice(
        (safeRunPage - 1) * RUN_PAGE_SIZE,
        safeRunPage * RUN_PAGE_SIZE,
      )
    : [];

  useEffect(() => {
    if (runPage !== safeRunPage) setRunPage(safeRunPage);
  }, [runPage, safeRunPage]);

  return (
    <div>
      <AdminHero
        title="Sources"
        icon={<MonitorActivity strokeWidth={1.75} aria-hidden />}
        description="Each feed is healthy when the last sync succeeded, returned records, and ran within a day. A failed or empty fetch is down."
      />
      <AdminBody className="space-y-10 pt-4 md:space-y-12 md:pt-6">
        <AdminStatus loading={loading} error={error} />
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {data ? (
          <>
            <MonitorSection
              bare
              className="-mt-4 sm:-mt-4 md:-mt-6"
              title="Sync pipeline"
              description="Every feed syncs automatically at 00:00 Bangkok time, and you can run a manual sync any time. Run history keeps each sync, what started it, and how many new software TORs passed the filter."
            >
              <GlassPanel
                title="Feeds"
                description="Status checks again every hour. Manual sync writes a run record."
                action={
                  <AdminButton
                    tone="teal"
                    disabled={busy !== null}
                    onClick={() => sync("all")}
                  >
                    {busy === "all" ? "Syncing…" : "Manual sync all"}
                  </AdminButton>
                }
              >
                <p className="mb-4 text-sm text-muted-foreground">
                  {lastSync
                    ? `Last sync: ${formatWhen(lastSync.finishedAt || lastSync.startedAt)}`
                    : "No sync recorded yet."}
                </p>
                <ul className="space-y-3">
                  {data.sources.map((source) => (
                    <li
                      key={source.key}
                      className="flex flex-col overflow-hidden rounded-lg bg-[color-mix(in_srgb,white_55%,transparent)] md:flex-row md:items-stretch md:justify-between"
                    >
                      <div
                        className="flex items-center px-4 py-3 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] backdrop-blur-md backdrop-saturate-150 md:w-48 md:shrink-0"
                        style={{ backgroundColor: tintFor(source.key, 72) }}
                      >
                        <p className="text-md font-semibold tracking-tight">
                          {source.label}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-3">
                        <Badge
                          variant="outline"
                          className="h-8 bg-gray-100 px-3 text-md tabular-nums backdrop-blur-none"
                        >
                          {source.count.toLocaleString("en-US")} stored
                        </Badge>
                        <VerdictBadge
                          verdict={source.verdict}
                          className="h-8 px-3 text-xs"
                        />
                        <AdminButton
                          disabled={busy !== null}
                          onClick={() => sync(source.key)}
                        >
                          {busy === source.key ? "Syncing…" : "Manual sync"}
                        </AdminButton>
                      </div>
                    </li>
                  ))}
                </ul>
              </GlassPanel>
            </MonitorSection>

            <MonitorSection
              bare
              title="Run history"
              description="Newest first, including auto syncs and manual sync all. New software TORs counts records that passed the filter and were added in that run."
            >
              <div className="overflow-x-auto rounded-lg bg-[color-mix(in_srgb,white_55%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_70%,transparent)]">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-[var(--palette-gray-50)] text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">
                        Source
                      </th>
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">
                        Timestamp
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                        Fetched
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                        Software
                      </th>
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">
                        By
                      </th>
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRuns.length ? (
                      pagedRuns.map((run) => {
                        const down = downFeeds(run, data.sources);
                        return (
                          <tr key={run._id} className="border-t border-white">
                            <td className="px-4 py-2.5 font-medium">
                              {runSource(run, sourceLabels)}
                            </td>
                            <td className="px-4 py-2.5">
                              <VerdictBadge
                                verdict={runVerdict(run)}
                                className="h-6 px-2 text-[0.625rem]"
                              />
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {formatWhen(run.startedAt)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {count(run.fetched)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {count(run.createdCount)}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {runBy(run)}
                            </td>
                            <td className="px-4 py-2.5">
                              {down.length ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground">
                                    Down:
                                  </span>
                                  {down.map((source) => (
                                    <Badge
                                      key={source.key}
                                      variant="outline"
                                      className="h-6 border-0 px-2 text-[0.625rem] text-foreground shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] backdrop-blur-md"
                                      style={{
                                        backgroundColor: tintFor(source.key, 72),
                                      }}
                                    >
                                      {source.label}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-6 text-center text-muted-foreground"
                        >
                          No sync runs yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {runCount > RUN_PAGE_SIZE ? (
                <nav
                  aria-label="Run history pages"
                  className="mt-4 flex justify-end"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminButton
                      size="icon"
                      aria-label="Previous page"
                      disabled={safeRunPage === 1}
                      onClick={() => setRunPage(Math.max(1, safeRunPage - 1))}
                    >
                      <HugeiconsIcon
                        icon={ArrowLeft01Icon}
                        strokeWidth={1.75}
                      />
                    </AdminButton>
                    {runPages.map((pageNumber) => (
                      <AdminButton
                        key={pageNumber}
                        size="icon"
                        aria-label={`Page ${pageNumber}`}
                        aria-current={
                          pageNumber === safeRunPage ? "page" : undefined
                        }
                        className={cn(
                          pageNumber === safeRunPage &&
                            "bg-[linear-gradient(180deg,var(--palette-gray-300),var(--palette-gray-200))]",
                        )}
                        onClick={() => setRunPage(pageNumber)}
                      >
                        {pageNumber}
                      </AdminButton>
                    ))}
                    <AdminButton
                      size="icon"
                      aria-label="Next page"
                      disabled={safeRunPage === runPageCount}
                      onClick={() =>
                        setRunPage(Math.min(runPageCount, safeRunPage + 1))
                      }
                    >
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        strokeWidth={1.75}
                      />
                    </AdminButton>
                  </div>
                </nav>
              ) : null}
            </MonitorSection>
          </>
        ) : null}
      </AdminBody>
    </div>
  );
}
