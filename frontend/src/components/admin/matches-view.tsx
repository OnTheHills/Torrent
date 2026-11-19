"use client";

import { useState, type CSSProperties } from "react";
import {
  CheckmarkCircle02Icon,
  Clock01Icon,
  HourglassIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import {
  AdminBody,
  AdminButton,
  AdminHero,
  AdminStatus,
  formatWhen,
  useAdminQuery,
} from "@/components/admin/admin-ui";
import { MonitorSection } from "@/components/monitor/monitor-section";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

const RETRY_REASON = "Retry failed match jobs";

const RAINBOW_GLOW = [
  "radial-gradient(ellipse 90% 80% at 0% 18%, var(--palette-orange-400), transparent)",
  "radial-gradient(ellipse 70% 70% at 38% 0%, var(--palette-yellow-400), transparent)",
  "radial-gradient(ellipse 90% 80% at 100% 12%, var(--palette-blue-400), transparent)",
  "radial-gradient(ellipse 70% 70% at 100% 100%, var(--palette-red-300), transparent)",
  "radial-gradient(ellipse 80% 80% at 0% 100%, var(--palette-teal-400), transparent)",
].join(",");

const COUNT_CARDS: {
  key: keyof Payload["counts"];
  label: string;
  description: string;
  icon: IconSvgElement;
  iconFg: string;
  iconClass?: string;
  scene?: string;
  ai?: boolean;
}[] = [
  {
    key: "pending",
    label: "Pending",
    description: "Queued for matching. Scoring has not started.",
    icon: Clock01Icon,
    iconFg: "text-[var(--palette-yellow-800)]",
    iconClass: "[&_circle]:fill-current [&_path]:stroke-white",
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-yellow-200)_62%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-yellow-300)_48%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-yellow-400)_36%,var(--palette-gray-200)))]",
  },
  {
    key: "waiting",
    label: "Waiting",
    description: "Paused on Vertex quota or a rate limit, then resumes.",
    icon: HourglassIcon,
    iconFg: "text-[var(--palette-orange-600)]",
    iconClass: "[&_path]:fill-current [&_path]:stroke-current",
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-orange-300)_68%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-orange-400)_56%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-orange-500)_44%,var(--palette-gray-200)))]",
  },
  {
    key: "running",
    label: "Running",
    description: "Vertex AI is scoring vendors against this TOR now.",
    icon: SparklesIcon,
    iconFg: "text-foreground",
    iconClass: "[&_path]:fill-current",
    ai: true,
  },
  {
    key: "complete",
    label: "Complete",
    description: "Finished scoring every vendor on this TOR.",
    icon: CheckmarkCircle02Icon,
    iconFg: "text-[var(--palette-green-800)]",
    iconClass:
      "[&_path:first-of-type]:fill-current [&_path:last-of-type]:stroke-white",
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-green-300)_52%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-green-400)_46%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-green-600)_40%,var(--palette-gray-200)))]",
  },
];

export function MatchesView() {
  const { data, error, loading, reload } = useAdminQuery<Payload>(
    "/api/admin/matches",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function retry(id?: string) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api<{ modified: number }>("/api/admin/matches/retry", {
        method: "POST",
        body: JSON.stringify({
          id,
          reason: id ? "Retry match job" : RETRY_REASON,
        }),
      });
      setMessage(`Requeued ${result.modified} jobs.`);
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setBusy(false);
    }
  }

  const failed = data?.failed ?? [];

  return (
    <div>
      <AdminHero
        title="Match jobs"
        icon={<HugeiconsIcon icon={SparklesIcon} strokeWidth={1.75} aria-hidden />}
        description="Background jobs that pair vendor profiles with open TORs. Failed runs stay on this page with the last error until you retry them."
      />
      <AdminBody className="space-y-10 pt-4 md:space-y-12 md:pt-6">
        <AdminStatus loading={loading} error={error} />
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
        {data ? (
          <>
            <MonitorSection
              bare
              className="-mt-4 sm:-mt-6 md:-mt-8"
              title="Match queue"
              description="Counts cover every matching job. Failed jobs sit below with the last error so you can send them through the queue again."
            >
              <ul className="grid grid-cols-2 gap-3 sm:gap-4">
                {COUNT_CARDS.map((card) => (
                  <li
                    key={card.key}
                    className="relative overflow-hidden rounded-2xl"
                  >
                    {card.ai ? (
                      <>
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0"
                          style={
                            { background: RAINBOW_GLOW } as CSSProperties
                          }
                        />
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--palette-black)_6%,transparent)]"
                        />
                      </>
                    ) : (
                      <div
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute inset-0",
                          card.scene,
                        )}
                      />
                    )}
                    <article
                      className={cn(
                        "relative flex h-full flex-col gap-3 p-5 md:p-6",
                        card.ai
                          ? "bg-[color-mix(in_srgb,white_18%,transparent)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] backdrop-blur-xl backdrop-saturate-150"
                          : "liquid-glass-card liquid-glass-card-static rounded-2xl",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <HugeiconsIcon
                          icon={card.icon}
                          strokeWidth={2}
                          className={cn(
                            "size-5 shrink-0",
                            card.iconFg,
                            card.iconClass,
                          )}
                        />
                        <h3
                          className={cn(
                            "text-xl font-semibold tracking-tight",
                            card.ai ? "text-foreground" : "liquid-glass-ink",
                          )}
                        >
                          {card.label}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <p
                          className={cn(
                            "min-w-0 text-sm leading-[1.7]",
                            card.ai
                              ? "text-muted-foreground"
                              : "liquid-glass-muted",
                          )}
                        >
                          {card.description}
                        </p>
                        <p
                          className={cn(
                            "shrink-0 text-3xl font-semibold tracking-tight tabular-nums",
                            card.ai ? "text-foreground" : "liquid-glass-ink",
                          )}
                        >
                          {data.counts[card.key]}
                        </p>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </MonitorSection>

            <MonitorSection
              bare
              title="Failed jobs"
              description="Last error and retry count for jobs that did not finish."
              action={
                failed.length ? (
                  <AdminButton
                    tone="teal"
                    disabled={busy}
                    onClick={() => retry()}
                  >
                    {busy ? "Retrying…" : "Retry failed"}
                  </AdminButton>
                ) : null
              }
            >
              <div className="liquid-glass-card liquid-glass-card-static liquid-glass-card-clear rounded-2xl p-5 md:p-6">
                {failed.length ? (
                  <ul className="space-y-3">
                    {failed.map((job) => (
                      <li
                        key={job._id}
                        className="flex flex-col gap-2 rounded-lg bg-[var(--palette-gray-50)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {job.status} · retries {job.retryCount || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {job.lastError}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatWhen(job.updatedAt)}
                          </p>
                        </div>
                        <AdminButton
                          disabled={busy}
                          onClick={() => retry(job._id)}
                        >
                          Retry
                        </AdminButton>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 px-6 text-center">
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={1.75}
                      className="size-16 text-[var(--palette-gray-300)] [&_path:first-of-type]:fill-current [&_path:last-of-type]:stroke-white"
                    />
                    <p className="text-lg font-semibold tracking-tight">
                      No failed jobs
                    </p>
                    <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                      The matching queue is clear. New errors will show up here
                      with the last message and a retry action.
                    </p>
                  </div>
                )}
              </div>
            </MonitorSection>
          </>
        ) : null}
      </AdminBody>
    </div>
  );
}
