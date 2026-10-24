"use client";

import { useEffect, useState } from "react";

import {
  AdminBody,
  AdminButton,
  AdminHero,
  AdminPanel,
  AdminStatus,
  ReasonField,
  fieldClass,
  useAdminQuery,
} from "@/components/admin/admin-ui";
import { api } from "@/lib/api";

type Settings = {
  includeKeywords: string[];
  excludeKeywords: string[];
  autoThreshold: number;
  reviewThreshold: number;
};

type Preview = {
  currentMatch: number;
  nextMatch: number;
  added: number;
  removed: number;
  sampleAdded: string[];
  sampleRemoved: string[];
};

export function SettingsView() {
  const { data, error, loading } = useAdminQuery<Settings>("/api/admin/settings");
  const [includeKeywords, setInclude] = useState("");
  const [excludeKeywords, setExclude] = useState("");
  const [autoThreshold, setAuto] = useState("90");
  const [reviewThreshold, setReview] = useState("80");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setInclude(data.includeKeywords.join("\n"));
    setExclude(data.excludeKeywords.join("\n"));
    setAuto(String(data.autoThreshold));
    setReview(String(data.reviewThreshold));
  }, [data]);

  function payload() {
    return {
      includeKeywords: includeKeywords.split("\n").map((item) => item.trim()).filter(Boolean),
      excludeKeywords: excludeKeywords.split("\n").map((item) => item.trim()).filter(Boolean),
      autoThreshold: Number(autoThreshold),
      reviewThreshold: Number(reviewThreshold),
      reason,
    };
  }

  async function runPreview() {
    setBusy(true);
    setMessage(null);
    try {
      setPreview(await api<Preview>("/api/admin/settings/preview", { method: "POST", body: JSON.stringify(payload()) }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api<{ hidden: number; restored: number }>("/api/admin/settings/apply", {
        method: "POST",
        body: JSON.stringify(payload()),
      });
      setMessage(`Applied. Hid ${result.hidden} and restored ${result.restored}.`);
      setPreview(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminHero
        title="Classification rules"
        description="Include and exclude terms decide which data.go titles stay in the software catalog. Preview the change before it hides or restores records."
      />
      <AdminBody>
        <AdminStatus loading={loading} error={error} />
        {data ? (
          <AdminPanel title="Keyword lists" description="One term per line. The next data.go sync uses the saved lists.">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs text-muted-foreground">
                Include
                <textarea className={`${fieldClass} mt-1 h-64 py-2`} value={includeKeywords} onChange={(event) => setInclude(event.target.value)} />
              </label>
              <label className="text-xs text-muted-foreground">
                Exclude
                <textarea className={`${fieldClass} mt-1 h-64 py-2`} value={excludeKeywords} onChange={(event) => setExclude(event.target.value)} />
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-xs text-muted-foreground">
                Auto-publish at or above
                <input className={`${fieldClass} mt-1`} value={autoThreshold} onChange={(event) => setAuto(event.target.value)} />
              </label>
              <label className="text-xs text-muted-foreground">
                Manual fix below
                <input className={`${fieldClass} mt-1`} value={reviewThreshold} onChange={(event) => setReview(event.target.value)} />
              </label>
            </div>
            <div className="mt-4 max-w-sm">
              <ReasonField value={reason} onChange={setReason} />
            </div>
            <div className="mt-4 flex gap-2">
              <AdminButton disabled={busy} onClick={runPreview}>Preview</AdminButton>
              <AdminButton tone="teal" disabled={busy} onClick={apply}>Apply</AdminButton>
            </div>
            {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
            {preview ? (
              <div className="mt-4 text-sm">
                <p>
                  Matching titles: {preview.currentMatch.toLocaleString("en-US")} now, {preview.nextMatch.toLocaleString("en-US")} after. {preview.added} would be added and {preview.removed} removed.
                </p>
                {preview.sampleRemoved.length ? (
                  <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                    {preview.sampleRemoved.map((title) => <li key={title}>{title}</li>)}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </AdminPanel>
        ) : null}
      </AdminBody>
    </div>
  );
}
