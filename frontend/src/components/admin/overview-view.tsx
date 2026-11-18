"use client";

import type { ReactNode } from "react";
import { LayoutGrid } from "lucide-react";

import { AdminStats } from "@/components/admin/admin-stats";
import {
  AdminBody,
  AdminHero,
  AdminStatus,
  VerdictBadge,
  formatWhen,
  useAdminQuery,
} from "@/components/admin/admin-ui";
import { MonitorSection } from "@/components/monitor/monitor-section";

type Overview = {
  tracked: number;
  hidden: number;
  queue: number;
  departments: number;
  accuracy: { sampleSize: number; accuracy: number | null; checked: number; corrections: number };
  sources: { key: string; label: string; verdict: string; lastRun: { finishedAt?: string; status?: string } | null }[];
  recentRuns: { _id: string; sourceKey: string; status: string; startedAt: string; error?: string }[];
};

function OverviewPanel({ children }: { children: ReactNode }) {
  return (
    <div className="liquid-glass-card liquid-glass-card-static liquid-glass-card-clear rounded-2xl p-5 md:p-6">
      {children}
    </div>
  );
}

export function OverviewView() {
  const { data, error, loading } = useAdminQuery<Overview>("/api/admin/overview");

  return (
    <div>
      <AdminHero
        title="Admin overview"
        icon={<LayoutGrid strokeWidth={1.75} aria-hidden />}
        description="Operator desk for ingestion, extraction quality, and the record of every manual change."
      />
      <AdminBody className="space-y-10 pt-4 md:space-y-12 md:pt-6">
        <AdminStatus loading={loading} error={error} />
        {data ? (
          <>
            <AdminStats
              tracked={data.tracked}
              hidden={data.hidden}
              queue={data.queue}
              sources={data.sources}
              accuracy={data.accuracy}
            />
            <MonitorSection
              bare
              title="Sources"
              description="Last completed sync for each ingestion feed."
            >
              <OverviewPanel>
                <ul className="divide-y divide-[color-mix(in_srgb,var(--palette-gray-300)_42%,transparent)]">
                  {data.sources.map((source) => (
                    <li
                      key={source.key}
                      className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{source.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {source.lastRun
                            ? `${source.lastRun.status} · ${formatWhen(source.lastRun.finishedAt)}`
                            : "No sync recorded"}
                        </p>
                      </div>
                      <VerdictBadge verdict={source.verdict} />
                    </li>
                  ))}
                </ul>
              </OverviewPanel>
            </MonitorSection>
            <MonitorSection
              bare
              title="Recent sync runs"
              description="Every sync the pipeline ran, newest first."
            >
              <OverviewPanel>
                <ul className="divide-y divide-[color-mix(in_srgb,var(--palette-gray-300)_42%,transparent)] text-sm">
                  {data.recentRuns.length ? (
                    data.recentRuns.map((run) => (
                      <li
                        key={run._id}
                        className="flex justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <span>
                          {run.sourceKey} · {run.status}
                        </span>
                        <span className="text-muted-foreground">
                          {formatWhen(run.startedAt)}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">
                      No runs yet. Start one from Sources.
                    </li>
                  )}
                </ul>
              </OverviewPanel>
            </MonitorSection>
          </>
        ) : null}
      </AdminBody>
    </div>
  );
}
