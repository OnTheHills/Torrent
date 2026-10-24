"use client";

import { useState } from "react";

import {
  AdminBody,
  AdminButton,
  AdminHero,
  AdminPanel,
  AdminStatus,
  ReasonField,
  formatWhen,
  useAdminQuery,
} from "@/components/admin/admin-ui";
import { api } from "@/lib/api";

type Job = {
  _id: string;
  torId: string;
  status: string;
  retryCount?: number;
  lastError?: string;
  updatedAt?: string;
};

type Payload = {
  counts: { pending: number; running: number; waiting: number; complete: number };
  failed: Job[];
};

export function MatchesView() {
  const { data, error, loading, reload } = useAdminQuery<Payload>("/api/admin/matches");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function retry(id?: string) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api<{ modified: number }>("/api/admin/matches/retry", {
        method: "POST",
        body: JSON.stringify({ id, reason }),
      });
      setMessage(`Requeued ${result.modified} jobs.`);
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminHero
        title="Match jobs"
        description="Vendor matching runs as a queue. Failed jobs stay here with the last error so they can be retried."
        actions={
          <AdminButton tone="teal" disabled={busy} onClick={() => retry()}>
            {busy ? "Retrying…" : "Retry failed"}
          </AdminButton>
        }
      />
      <AdminBody>
        <div className="max-w-sm">
          <ReasonField value={reason} onChange={setReason} />
        </div>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <AdminStatus loading={loading} error={error} />
        {data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              {Object.entries(data.counts).map(([status, count]) => (
                <div key={status} className="rounded-lg bg-[var(--palette-gray-50)] px-4 py-3 ring-1 ring-[color-mix(in_srgb,white_72%,transparent)]">
                  <p className="text-xs text-muted-foreground">{status}</p>
                  <p className="text-2xl font-semibold tabular-nums">{count}</p>
                </div>
              ))}
            </div>
            <AdminPanel title="Jobs with errors">
              <ul className="space-y-3">
                {data.failed.length ? (
                  data.failed.map((job) => (
                    <li key={job._id} className="flex flex-col gap-2 rounded-lg bg-[color-mix(in_srgb,white_55%,transparent)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium">{job.status} · retries {job.retryCount || 0}</p>
                        <p className="text-xs text-muted-foreground">{job.lastError}</p>
                        <p className="text-xs text-muted-foreground">{formatWhen(job.updatedAt)}</p>
                      </div>
                      <AdminButton disabled={busy} onClick={() => retry(job._id)}>Retry</AdminButton>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-muted-foreground">No failed jobs.</li>
                )}
              </ul>
            </AdminPanel>
          </>
        ) : null}
      </AdminBody>
    </div>
  );
}
