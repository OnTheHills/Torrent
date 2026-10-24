"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Alert02Icon,
  ArrowLeft01Icon,
  BadgePercentIcon,
  BankIcon,
  File01Icon,
  LinkSquare02Icon,
  SourceCodeIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  AdminBody,
  AdminButton,
  AdminPanel,
  AdminStatus,
  ReasonField,
  fieldClass,
  frostButton,
  useAdminQuery,
} from "@/components/admin/admin-ui";
import { WatchOutCard } from "@/components/admin/watch-out-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { api } from "@/lib/api";

type TorRecord = {
  id: string;
  title: string;
  titleEn?: string;
  source?: string;
  department?: string;
  category?: string;
  status?: string;
  budgetThb: number;
  publishedAt?: string;
  deadline?: string;
  confidence: number;
  reviewStatus?: string;
  reviewMissing: string[];
  reviewScoreSource?: string | null;
  reviewScoreReason?: string;
  integrityStatus?: string;
  integrityFlags?: string[];
  integrityReason?: string;
  integrityNote?: string;
  egpUrl?: string;
  pdfUrl?: string;
  summary?: string;
};

const RAINBOW_GLOW = [
  "radial-gradient(ellipse 46% 64% at 6% 28%, var(--palette-orange-300), transparent)",
  "radial-gradient(ellipse 40% 52% at 30% 6%, var(--palette-yellow-300), transparent)",
  "radial-gradient(ellipse 44% 58% at 82% 8%, var(--palette-blue-300), transparent)",
  "radial-gradient(ellipse 46% 64% at 94% 78%, var(--palette-red-200), transparent)",
  "radial-gradient(ellipse 46% 64% at 8% 92%, var(--palette-teal-300), transparent)",
].join(",");

const SOURCE_LABEL: Record<string, string> = {
  "DATA-GO-EGP": "e-GP",
  "BMA-EGP2": "BMA e-GP2",
  "EGP-RSS": "e-GP RSS",
  "SME-GP": "SME-GP",
};

function dateInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    date,
  );
}

function effectiveBand(status: string | undefined, confidence: number) {
  if (status === "manual" || status === "review") return status;
  if (confidence < 80) return "manual";
  if (confidence < 90) return "review";
  return "review";
}

function bandLabel(band: string) {
  if (band === "manual") return "Must check";
  if (band === "review") return "Lookup";
  return band;
}

function bandTint(band: string) {
  if (band === "manual") return "var(--palette-red-200)";
  if (band === "review") return "var(--palette-yellow-200)";
  return "var(--palette-gray-200)";
}

export function ReviewDetailView({ id }: { id: string }) {
  const { data, error, loading } = useAdminQuery<TorRecord>(
    `/api/admin/tors/${id}`,
  );
  const [reason, setReason] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; url: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  useEffect(() => {
    if (!data?.pdfUrl) return;

    let objectUrl = "";
    let cancelled = false;

    // Same-origin Next.js proxy fetches the PDF on the host (Docker backend
    // can't resolve e-GP), then we blob it so iframe isn't blocked by XFO.
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setPdfPreview({ status: "loading" });
      try {
        const response = await fetch(`/api/admin/tors/${id}/pdf`, {
          credentials: "include",
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const message =
            typeof body === "object" && body && "message" in body
              ? String((body as { message: string }).message)
              : `Could not load PDF (${response.status})`;
          throw new Error(message);
        }
        const blob = await response.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        objectUrl = url;
        setPdfPreview({ status: "ready", url });
      } catch (err) {
        if (cancelled) return;
        setPdfPreview({
          status: "error",
          message: err instanceof Error ? err.message : "Could not load PDF",
        });
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data?.pdfUrl, id]);

  const preview = data?.pdfUrl ? pdfPreview : { status: "idle" as const };

  function value(name: string, fallback = "") {
    return fields[name] ?? fallback;
  }

  async function decide(decision: "approve" | "fix" | "reject") {
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/admin/review/${id}`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          reason,
          fields: {
            budgetThb: value("budgetThb", String(data?.budgetThb ?? "")),
            deadline: value("deadline", dateInput(data?.deadline)),
            publishedAt: value("publishedAt", dateInput(data?.publishedAt)),
            category: value("category", data?.category || ""),
            department: value("department", data?.department || ""),
            status: value("status", data?.status || ""),
          },
        }),
      });
      setMessage(
        decision === "reject"
          ? "Rejected and hidden."
          : "Saved to the audit log.",
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }

  const scoreTitle =
    data?.reviewScoreSource === "vertex"
      ? "Vertex AI score"
      : data?.reviewScoreSource === "heuristic"
        ? "Heuristic score"
        : "Quality score";
  const scoreBody =
    data?.reviewScoreReason ||
    (data?.reviewMissing?.length
      ? `Missing ${data.reviewMissing.join(", ")}`
      : "No score note yet.");
  const sourceLabel = data?.source
    ? SOURCE_LABEL[data.source] || data.source
    : "";
  const band = data
    ? effectiveBand(data.reviewStatus, data.confidence)
    : "review";

  const dirty =
    !!data &&
    (Boolean(reason.trim()) ||
      value("budgetThb", String(data.budgetThb || "")) !==
        String(data.budgetThb || "") ||
      value("publishedAt", dateInput(data.publishedAt)) !==
        dateInput(data.publishedAt) ||
      value("deadline", dateInput(data.deadline)) !==
        dateInput(data.deadline) ||
      value("category", data.category || "") !== (data.category || "") ||
      value("department", data.department || "") !== (data.department || "") ||
      value("status", data.status || "") !== (data.status || ""));

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden bg-surface text-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(144px+2rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3rem)]">
          <Button asChild size="lg" className={frostButton}>
            <Link href={routes.admin.review}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              Back to queue
            </Link>
          </Button>
          <div className="mt-8 w-full max-w-5xl">
            {loading && !data ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : data ? (
              <>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl md:leading-[1.15]">
                  {data.title}
                </h1>
                {sourceLabel || data.department ? (
                  <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-base leading-[1.7] text-muted-foreground md:text-lg">
                    {sourceLabel ? (
                      <span className="inline-flex items-center gap-1.5">
                        <HugeiconsIcon
                          icon={SourceCodeIcon}
                          strokeWidth={1.75}
                          className="size-5 shrink-0"
                        />
                        <span>{sourceLabel}</span>
                      </span>
                    ) : null}
                    {data.department ? (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <HugeiconsIcon
                          icon={BankIcon}
                          strokeWidth={1.75}
                          className="size-4 shrink-0"
                        />
                        <span>{data.department}</span>
                      </span>
                    ) : null}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Badge
                    variant="outline"
                    className="inline-flex h-10 items-center gap-1.5 border-0 px-3 pr-2 text-sm font-medium text-foreground [&>svg]:size-4!"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${bandTint(band)} 72%, transparent)`,
                    }}
                  >
                    <HugeiconsIcon icon={BadgePercentIcon} strokeWidth={2} />
                    {bandLabel(band)}
                    <span className="inline-flex h-6 items-center rounded-full bg-white px-2 text-xs font-semibold text-foreground">
                      {data.confidence}%
                    </span>
                  </Badge>
                  <div className="flex flex-wrap items-center gap-3">
                    {data.egpUrl ? (
                      <Button asChild size="lg" variant="orange">
                        <a href={data.egpUrl} target="_blank" rel="noreferrer">
                          Open listing
                          <HugeiconsIcon
                            icon={LinkSquare02Icon}
                            strokeWidth={2}
                          />
                        </a>
                      </Button>
                    ) : null}
                    {data.pdfUrl ? (
                      <Button asChild size="lg" variant="outline">
                        <a href={data.pdfUrl} target="_blank" rel="noreferrer">
                          Open PDF
                          <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <AdminBody>
        <AdminStatus loading={loading} error={error} />
        {data ? (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-lg">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: RAINBOW_GLOW } as CSSProperties}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--palette-black)_14%,transparent)]"
              />
              <div className="relative bg-[color-mix(in_srgb,white_40%,transparent)] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] backdrop-blur-3xl backdrop-saturate-150 md:p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,white_18%,transparent)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] ring-1 ring-white/35 backdrop-blur-md backdrop-saturate-150">
                    <HugeiconsIcon
                      icon={SparklesIcon}
                      strokeWidth={2}
                      className="size-4 text-foreground"
                    />
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {scoreTitle}
                  </h2>
                </div>
                <p className="mt-3 text-sm leading-[1.7] text-foreground md:text-base">
                  {scoreBody}
                </p>
              </div>
            </div>

            <WatchOutCard data={data} />

            <div className="grid gap-6 lg:grid-cols-2">
              <AdminPanel
                title="Source document"
                description="Verify extracted fields against the official document"
              >
                {!data.pdfUrl ? (
                  <p className="text-sm text-muted-foreground">
                    No PDF attached to this TOR.
                  </p>
                ) : preview.status === "loading" ||
                  preview.status === "idle" ? (
                  <div className="flex h-[min(70vh,720px)] items-center justify-center rounded-md bg-muted/40 text-sm text-muted-foreground">
                    Loading PDF…
                  </div>
                ) : preview.status === "error" ? (
                  <div className="flex h-[min(70vh,720px)] flex-col items-center justify-center gap-4 rounded-md bg-[color-mix(in_srgb,var(--palette-red-50)_70%,transparent)] px-6 py-8 text-center">
                    <HugeiconsIcon
                      icon={Alert02Icon}
                      strokeWidth={1.75}
                      className="size-12 text-[var(--palette-red-700)]"
                    />
                    <p className="max-w-md text-sm font-medium leading-snug text-[var(--palette-red-800)] md:text-base">
                      {preview.message}
                    </p>
                  </div>
                ) : (
                  <iframe
                    title="Source document preview"
                    src={preview.url}
                    className="h-[min(70vh,720px)] w-full rounded-md border border-border bg-white"
                  />
                )}
              </AdminPanel>
              <AdminPanel
                title="Review fields"
                description="Update fields only where they differ from the source record."
              >
                <div className="grid gap-3">
                  <label className="text-xs text-muted-foreground">
                    Budget (THB)
                    <input
                      className={`${fieldClass} mt-1`}
                      value={value("budgetThb", String(data.budgetThb || ""))}
                      onChange={(event) =>
                        setFields((prev) => ({
                          ...prev,
                          budgetThb: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Announced
                    <input
                      type="date"
                      className={`${fieldClass} mt-1`}
                      value={value("publishedAt", dateInput(data.publishedAt))}
                      onChange={(event) =>
                        setFields((prev) => ({
                          ...prev,
                          publishedAt: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Deadline
                    <input
                      type="date"
                      className={`${fieldClass} mt-1`}
                      value={value("deadline", dateInput(data.deadline))}
                      onChange={(event) =>
                        setFields((prev) => ({
                          ...prev,
                          deadline: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Category
                    <input
                      className={`${fieldClass} mt-1`}
                      value={value("category", data.category || "")}
                      onChange={(event) =>
                        setFields((prev) => ({
                          ...prev,
                          category: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Department
                    <input
                      className={`${fieldClass} mt-1`}
                      value={value("department", data.department || "")}
                      onChange={(event) =>
                        setFields((prev) => ({
                          ...prev,
                          department: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Status
                    <input
                      className={`${fieldClass} mt-1`}
                      value={value("status", data.status || "")}
                      onChange={(event) =>
                        setFields((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <ReasonField value={reason} onChange={setReason} />
                  <div className="pt-2 flex flex-wrap justify-end gap-2">
                    <AdminButton
                      disabled={busy}
                      onClick={() => decide("approve")}
                    >
                      Approve
                    </AdminButton>
                    <AdminButton
                      tone={dirty ? "teal" : "neutral"}
                      disabled={busy}
                      onClick={() => decide("fix")}
                    >
                      Save fix
                    </AdminButton>
                    <AdminButton
                      tone={dirty ? "neutral" : "red"}
                      disabled={busy}
                      onClick={() => decide("reject")}
                    >
                      Reject
                    </AdminButton>
                  </div>
                  {message ? (
                    <p className="text-sm text-muted-foreground">{message}</p>
                  ) : null}
                </div>
              </AdminPanel>
            </div>
          </div>
        ) : null}
      </AdminBody>
    </div>
  );
}
