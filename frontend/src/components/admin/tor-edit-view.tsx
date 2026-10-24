"use client";

import Link from "next/link";
import { useState } from "react";

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
import { WatchOutCard } from "@/components/admin/watch-out-card";
import { routes } from "@/config/routes";
import { api } from "@/lib/api";

type TorRecord = {
  id: string;
  title: string;
  titleEn?: string;
  category?: string;
  status?: string;
  budgetThb: number;
  budgetYear?: string;
  department?: string;
  summary?: string;
  hidden: boolean;
  confidence: number;
  reviewStatus: string;
  integrityStatus?: string;
  integrityFlags?: string[];
  integrityReason?: string;
  integrityNote?: string;
};

export function TorEditView({ id }: { id: string }) {
  const { data, error, loading } = useAdminQuery<TorRecord>(`/api/admin/tors/${id}`);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function field(name: string, fallback = "") {
    return draft[name] ?? fallback;
  }

  async function save(hidden?: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/admin/tors/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          reason,
          title: field("title", data?.titleEn || data?.title || ""),
          category: field("category", data?.category || ""),
          status: field("status", data?.status || ""),
          budgetThb: field("budgetThb", String(data?.budgetThb || "")),
          budgetYear: field("budgetYear", data?.budgetYear || ""),
          department: field("department", data?.department || ""),
          summary: field("summary", data?.summary || ""),
          ...(hidden === undefined ? {} : { hidden }),
        }),
      });
      setMessage("Saved. The change is in the audit log.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminHero
        title="Edit record"
        description="Every saved field needs a reason. The previous value stays in the audit log."
        actions={
          <AdminButton asChild>
            <Link href={routes.admin.tors}>Back to records</Link>
          </AdminButton>
        }
      />
      <AdminBody>
        <AdminStatus loading={loading} error={error} />
        {data ? (
          <div className="space-y-6">
            <WatchOutCard data={data} />
            <AdminPanel title={data.title} description={`${data.confidence}% · ${data.reviewStatus}${data.hidden ? " · hidden" : ""}`}>
              <div className="grid gap-3">
                {(
                  [
                    ["title", "Title", data.titleEn || data.title],
                    ["category", "Category", data.category || ""],
                    ["status", "Status", data.status || ""],
                    ["budgetThb", "Budget (THB)", String(data.budgetThb || "")],
                    ["budgetYear", "Budget year", data.budgetYear || ""],
                    ["department", "Department", data.department || ""],
                  ] as const
                ).map(([name, label, fallback]) => (
                  <label key={name} className="text-xs text-muted-foreground">
                    {label}
                    <input className={`${fieldClass} mt-1`} value={field(name, fallback)} onChange={(event) => setDraft((prev) => ({ ...prev, [name]: event.target.value }))} />
                  </label>
                ))}
                <label className="text-xs text-muted-foreground">
                  Summary
                  <textarea className={`${fieldClass} mt-1 h-28 py-2`} value={field("summary", data.summary || "")} onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))} />
                </label>
                <ReasonField value={reason} onChange={setReason} />
                <div className="flex flex-wrap gap-2">
                  <AdminButton tone="teal" disabled={busy} onClick={() => save()}>Save</AdminButton>
                  <AdminButton disabled={busy} onClick={() => save(true)}>Hide</AdminButton>
                  <AdminButton disabled={busy} onClick={() => save(false)}>Restore</AdminButton>
                </div>
                {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
              </div>
            </AdminPanel>
          </div>
        ) : null}
      </AdminBody>
    </div>
  );
}
