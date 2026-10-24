"use client";

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
import { api } from "@/lib/api";

type Certificate = { name?: string; issuer?: string; status?: string; note?: string };
type Person = {
  id: string;
  email: string;
  name: string;
  role: "public" | "vendor" | "admin";
  disabled: boolean;
  companyName: string;
  completeness: number;
  certificates: Certificate[];
  profileId: string | null;
};

export function UsersView() {
  const { data, error, loading, reload } = useAdminQuery<{ items: Person[] }>("/api/admin/users");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function saveUser(person: Person, patch: { role?: string; disabled?: boolean }) {
    setMessage(null);
    try {
      await api(`/api/admin/users/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...patch, reason }),
      });
      setMessage(`Updated ${person.email}.`);
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function certificate(person: Person, body: Record<string, unknown>) {
    setMessage(null);
    try {
      await api("/api/admin/certificates", {
        method: "POST",
        body: JSON.stringify({ ...body, userId: person.id, profileId: person.profileId, reason }),
      });
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Certificate update failed");
    }
  }

  return (
    <div>
      <AdminHero
        title="Users"
        description="Change a role or disable an account with a reason. Vendor completeness counts profile fields plus one approved certificate."
      />
      <AdminBody>
        <AdminPanel title="Accounts">
          <div className="mb-4 max-w-sm">
            <ReasonField value={reason} onChange={setReason} />
          </div>
          {message ? <p className="mb-3 text-sm text-muted-foreground">{message}</p> : null}
          <AdminStatus loading={loading} error={error} />
          <ul className="space-y-4">
            {data?.items.map((person) => (
              <li key={person.id} className="rounded-lg bg-[color-mix(in_srgb,white_55%,transparent)] px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{person.name || person.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.email}
                      {person.companyName ? ` · ${person.companyName}` : ""} · profile {person.completeness}%
                      {person.disabled ? " · disabled" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className={`${fieldClass} w-32`}
                      value={person.role}
                      onChange={(event) => saveUser(person, { role: event.target.value })}
                    >
                      <option value="public">public</option>
                      <option value="vendor">vendor</option>
                      <option value="admin">admin</option>
                    </select>
                    <AdminButton onClick={() => saveUser(person, { disabled: !person.disabled })}>
                      {person.disabled ? "Enable" : "Disable"}
                    </AdminButton>
                  </div>
                </div>
                {person.profileId ? (
                  <div className="mt-3 space-y-2">
                    {person.certificates.map((item, index) => (
                      <div key={`${item.name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span>
                          {item.name || "Certificate"} · {item.status}
                        </span>
                        <span className="flex gap-2">
                          <button type="button" className="underline" onClick={() => certificate(person, { index, status: "approved" })}>Approve</button>
                          <button type="button" className="underline" onClick={() => certificate(person, { index, status: "rejected" })}>Reject</button>
                        </span>
                      </div>
                    ))}
                    <form
                      className="flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const name = String(new FormData(event.currentTarget).get("name") || "").trim();
                        if (!name) return;
                        event.currentTarget.reset();
                        void certificate(person, { name, status: "pending" });
                      }}
                    >
                      <input name="name" className={fieldClass} placeholder="Certificate name" />
                      <AdminButton type="submit">Add</AdminButton>
                    </form>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No vendor profile yet.</p>
                )}
              </li>
            ))}
          </ul>
        </AdminPanel>
      </AdminBody>
    </div>
  );
}
