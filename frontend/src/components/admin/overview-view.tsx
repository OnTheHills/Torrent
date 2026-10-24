"use client";

import Link from "next/link";

import { AdminStats } from "@/components/admin/admin-stats";
import {
  AdminBody,
  AdminButton,
  AdminHero,
  AdminPanel,
  AdminStatus,
  VerdictBadge,
  formatWhen,
  useAdminQuery,
} from "@/components/admin/admin-ui";
import { routes } from "@/config/routes";

type Overview = {
  tracked: number;
  hidden: number;
  queue: number;
  departments: number;
  accuracy: { sampleSize: number; accuracy: number | null; checked: number; corrections: number };
  sources: { key: string; label: string; verdict: string; lastRun: { finishedAt?: string; status?: string } | null }[];
  recentRuns: { _id: string; sourceKey: string; status: string; startedAt: string; error?: string }[];
};

export function OverviewView() {
  const { data, error, loading } = useAdminQuery<Overview>("/api/admin/overview");

  return (
    <div>
      <AdminHero
        title="Admin overview"
        description="Operator desk for ingestion, extraction quality, and the record of every manual change."
        actions={
          <>
            <AdminButton asChild tone="teal">
              <Link href={routes.admin.sources}>Source health</Link>
            </AdminButton>
            <AdminButton asChild>
              <Link href={routes.admin.review}>Review queue</Link>
            </AdminButton>
          </>
        }
      />
      <AdminBody>
        <AdminStatus loading={loading} error={error} />
        {data ? (
          <>
            <AdminStats tracked={data.tracked} agencies={data.departments} queue={data.queue} />
            <AdminPanel
              title="Extraction accuracy"
              description={
                data.accuracy.sampleSize
                  ? `${data.accuracy.accuracy}% of checked fields matched the source across ${data.accuracy.sampleSize} reviews. Above 90% can publish automatically, 80–90% stays in review, and below 80% needs a manual fix.`
                  : "No reviewed sample yet. Score the catalog, then approve or correct records. Accuracy is the share of checked fields left unchanged."
              }
              action={
                <AdminButton asChild>
                  <Link href={routes.admin.review}>Open review</Link>
                </AdminButton>
              }
            >
              <p className="text-sm text-muted-foreground">
                {data.hidden} hidden records are kept out of the public catalog.
              </p>
            </AdminPanel>
            <AdminPanel title="Sources" description="Latest sync for each feed.">
              <ul className="space-y-3">
                {data.sources.map((source) => (
                  <li
                    key={source.key}
                    className="flex flex-col gap-2 rounded-lg bg-[color-mix(in_srgb,white_55%,transparent)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
            </AdminPanel>
            <AdminPanel title="Recent sync runs">
              <ul className="space-y-2 text-sm">
                {data.recentRuns.length ? (
                  data.recentRuns.map((run) => (
                    <li key={run._id} className="flex justify-between gap-3">
                      <span>
                        {run.sourceKey} · {run.status}
                      </span>
                      <span className="text-muted-foreground">{formatWhen(run.startedAt)}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">No runs yet. Start one from Sources.</li>
                )}
              </ul>
            </AdminPanel>
          </>
        ) : null}
      </AdminBody>
    </div>
  );
}
