"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  AdminBody,
  AdminButton,
  AdminHero,
  AdminStatus,
  ReasonField,
  useAdminQuery,
} from "@/components/admin/admin-ui";
import { FilterChecks } from "@/components/tor/tor-filters";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Surface } from "@/components/ui/surface";
import { routes } from "@/config/routes";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Certificate = {
  name?: string;
  issuer?: string;
  status?: string;
  note?: string;
};

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

type RoleFilter = "public" | "vendor" | "admin";
type StatusFilter = "active" | "disabled";
type ProfileFilter = "none" | "incomplete" | "ready";
type UsersSort = "name" | "completenessDesc" | "completenessAsc";

type UsersFilterState = {
  roles: RoleFilter[];
  statuses: StatusFilter[];
  profiles: ProfileFilter[];
  sort: UsersSort;
};

const DEFAULT_FILTERS: UsersFilterState = {
  roles: [],
  statuses: [],
  profiles: [],
  sort: "name",
};

type PendingAction = {
  kind: "role";
  person: Person;
  role: Person["role"];
};

const frostSelect =
  "h-10! shrink-0 rounded-full border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)]";

const frostSelectSmBase =
  "h-8! w-[7.5rem] rounded-full border-0 text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)]";

function rolePillClass(role: Person["role"]) {
  if (role === "vendor") {
    return cn(
      frostSelectSmBase,
      "bg-[color-mix(in_srgb,var(--palette-blue-200)_55%,transparent)] text-[var(--palette-blue-800)] ring-1 ring-[color-mix(in_srgb,var(--palette-blue-400)_42%,transparent)]",
    );
  }
  if (role === "admin") {
    return cn(
      frostSelectSmBase,
      "bg-[color-mix(in_srgb,var(--palette-yellow-300)_48%,transparent)] text-[var(--palette-yellow-800)] ring-1 ring-[color-mix(in_srgb,var(--palette-yellow-400)_44%,transparent)] backdrop-blur-md backdrop-saturate-150",
    );
  }
  return cn(
    frostSelectSmBase,
    "bg-[color-mix(in_srgb,var(--palette-green-600)_22%,transparent)] text-[var(--palette-green-800)] ring-1 ring-[color-mix(in_srgb,var(--palette-green-600)_36%,transparent)]",
  );
}

function toggleMany<T extends string>(
  current: T[],
  value: T,
  checked: boolean,
) {
  if (!checked) return current.filter((item) => item !== value);
  return current.includes(value) ? current : [...current, value];
}

function profileBucket(person: Person): ProfileFilter {
  if (!person.profileId) return "none";
  return person.completeness >= 80 ? "ready" : "incomplete";
}

function matchesQuery(person: Person, query: string) {
  if (!query) return true;
  const haystack = [person.name, person.email, person.companyName, person.role]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function filterPeople(
  items: Person[],
  query: string,
  filters: UsersFilterState,
) {
  const next = items.filter((person) => {
    if (!matchesQuery(person, query)) return false;
    if (filters.roles.length && !filters.roles.includes(person.role)) {
      return false;
    }
    if (filters.statuses.length) {
      const status: StatusFilter = person.disabled ? "disabled" : "active";
      if (!filters.statuses.includes(status)) return false;
    }
    if (filters.profiles.length) {
      if (!filters.profiles.includes(profileBucket(person))) return false;
    }
    return true;
  });

  next.sort((a, b) => {
    if (filters.sort === "completenessDesc") {
      return b.completeness - a.completeness || a.email.localeCompare(b.email);
    }
    if (filters.sort === "completenessAsc") {
      return a.completeness - b.completeness || a.email.localeCompare(b.email);
    }
    const nameA = (a.name || a.email).toLowerCase();
    const nameB = (b.name || b.email).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return next;
}

function pendingSummary(action: PendingAction) {
  return `Change ${action.person.email} to ${action.role}`;
}

function UsersFilters({
  value,
  onChange,
  onClear,
}: {
  value: UsersFilterState;
  onChange: (next: UsersFilterState) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">Filters</h3>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-8 shrink-0 items-center rounded-full border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] px-3 text-sm text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none"
        >
          Clear
        </button>
      </div>
      <FilterChecks
        label="Role"
        items={[
          { value: "vendor", label: "Vendor" },
          { value: "public", label: "Public" },
          { value: "admin", label: "Admin" },
        ]}
        isChecked={(role) => value.roles.includes(role)}
        onToggle={(role, checked) =>
          onChange({
            ...value,
            roles: toggleMany(value.roles, role, checked),
          })
        }
      />
      <FilterChecks
        label="Status"
        items={[
          { value: "active", label: "Active" },
          { value: "disabled", label: "Disabled" },
        ]}
        isChecked={(status) => value.statuses.includes(status)}
        onToggle={(status, checked) =>
          onChange({
            ...value,
            statuses: toggleMany(value.statuses, status, checked),
          })
        }
      />
      <FilterChecks
        label="Vendor profile"
        items={[
          { value: "ready", label: "Ready (80%+)" },
          { value: "incomplete", label: "Incomplete" },
          { value: "none", label: "No profile" },
        ]}
        isChecked={(profile) => value.profiles.includes(profile)}
        onToggle={(profile, checked) =>
          onChange({
            ...value,
            profiles: toggleMany(value.profiles, profile, checked),
          })
        }
      />
    </div>
  );
}

export function UsersView() {
  const { data, error, loading, reload } = useAdminQuery<{ items: Person[] }>(
    "/api/admin/users",
  );
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<UsersFilterState>(DEFAULT_FILTERS);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const items = useMemo(
    () => filterPeople(data?.items ?? [], query, filters),
    [data?.items, query, filters],
  );

  const pendingCerts = (person: Person) =>
    person.certificates.filter((item) => item.status === "pending").length;

  function applyFilters(next: UsersFilterState) {
    setFilters(next);
    setPending(null);
    setReason("");
  }

  function requestRole(person: Person, role: Person["role"]) {
    if (role === person.role) return;
    setPending({ kind: "role", person, role });
    setReason("");
    setMessage(null);
  }

  async function confirmPending() {
    if (!pending || !reason.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/admin/users/${pending.person.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: pending.role,
          reason: reason.trim(),
        }),
      });
      setMessage(`Updated ${pending.person.email}.`);
      setPending(null);
      setReason("");
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminHero
        className="max-w-screen-2xl"
        title="Users"
        description="Find accounts and change roles. Open a profile to review capability, certificates, and disable access."
      />
      <AdminBody className="max-w-screen-2xl space-y-10 md:space-y-12">
        <div className="grid items-start gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="flex items-end justify-between gap-4 lg:col-span-2">
            <h2 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-[1.2]">
              Accounts
            </h2>
            <p className="text-sm text-muted-foreground">
              {loading && !data ? (
                "Loading…"
              ) : (
                <>
                  <span className="font-semibold tabular-nums text-foreground">
                    {items.length.toLocaleString("en-US")}
                  </span>{" "}
                  {items.length === 1 ? "account" : "accounts"}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 lg:col-span-2">
            <form
              className="relative isolate min-w-0 flex-1 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(draftQuery.trim());
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]"
              />
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={1.75}
                className="pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Search name, email, or company"
                className="relative h-10 rounded-full border-0 bg-transparent pr-4 pl-11 shadow-none ring-0 focus-visible:ring-0"
              />
            </form>
            <Select
              value={filters.sort}
              onValueChange={(sort) =>
                applyFilters({ ...filters, sort: sort as UsersSort })
              }
            >
              <SelectTrigger
                aria-label="Sort"
                className={cn(frostSelect, "w-44 sm:w-52")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A → Z</SelectItem>
                <SelectItem value="completenessDesc">
                  Profile high → low
                </SelectItem>
                <SelectItem value="completenessAsc">
                  Profile low → high
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pending ? (
            <div className="lg:col-span-2">
              <Surface className="flex flex-col gap-3 bg-surface p-4 ring-transparent sm:flex-row sm:items-end sm:gap-4 md:p-5">
                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-sm font-medium">
                    {pendingSummary(pending)}
                  </p>
                  <ReasonField value={reason} onChange={setReason} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminButton
                    tone="teal"
                    disabled={busy || reason.trim().length < 3}
                    onClick={() => void confirmPending()}
                  >
                    {busy ? "Saving…" : "Confirm"}
                  </AdminButton>
                  <AdminButton
                    tone="glass"
                    disabled={busy}
                    onClick={() => {
                      setPending(null);
                      setReason("");
                    }}
                  >
                    Cancel
                  </AdminButton>
                </div>
              </Surface>
            </div>
          ) : null}

          {message ? (
            <p className="text-sm text-muted-foreground lg:col-span-2">
              {message}
            </p>
          ) : null}

          <aside className="self-start lg:sticky lg:top-6 lg:max-h-[calc(100dvh-72px-3rem)] lg:overflow-y-auto">
            <Surface className="bg-surface p-5 ring-transparent md:p-6">
              <UsersFilters
                value={filters}
                onChange={applyFilters}
                onClear={() => applyFilters(DEFAULT_FILTERS)}
              />
            </Surface>
          </aside>

          <div className="min-w-0 space-y-4">
            <AdminStatus loading={loading && !data} error={error} />
            <Surface className="overflow-hidden bg-surface p-0 ring-transparent">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[22%]" />
                    <col className="w-[22%]" />
                    <col className="w-[16%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[16%]" />
                  </colgroup>
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-[color-mix(in_srgb,var(--palette-gray-300)_35%,transparent)]">
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-3 py-3 font-medium">Company</th>
                      <th className="px-3 py-3 font-medium">Role</th>
                      <th className="py-3 pr-8 pl-3 text-right font-medium">
                        Profile
                      </th>
                      <th className="py-3 pr-3 pl-8 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length ? (
                      items.map((person) => {
                        const waiting = pendingCerts(person);
                        return (
                          <tr
                            key={person.id}
                            className={cn(
                              "border-t border-[color-mix(in_srgb,var(--palette-gray-300)_28%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,white_45%,transparent)]",
                              person.disabled && "opacity-70",
                            )}
                          >
                            <td className="px-4 py-3 align-middle">
                              <p className="truncate font-medium">
                                {person.name || person.email}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {person.email}
                                {waiting > 0
                                  ? ` · ${waiting} cert pending`
                                  : ""}
                              </p>
                            </td>
                            <td className="truncate px-3 py-3 align-middle text-muted-foreground">
                              {person.companyName || "—"}
                            </td>
                            <td className="px-3 py-3 align-middle">
                              <Select
                                value={person.role}
                                onValueChange={(role) =>
                                  requestRole(person, role as Person["role"])
                                }
                              >
                                <SelectTrigger
                                  aria-label={`Role for ${person.email}`}
                                  className={rolePillClass(person.role)}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="public">public</SelectItem>
                                  <SelectItem value="vendor">vendor</SelectItem>
                                  <SelectItem value="admin">admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-3 pr-8 pl-3 align-middle text-right tabular-nums">
                              {person.profileId
                                ? `${person.completeness}%`
                                : "—"}
                            </td>
                            <td className="py-3 pr-3 pl-8 align-middle">
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  person.disabled
                                    ? "text-[var(--palette-red-700)]"
                                    : "text-muted-foreground",
                                )}
                              >
                                {person.disabled ? "Disabled" : "Active"}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle text-right">
                              <AdminButton asChild className="inline-flex">
                                <Link
                                  href={routes.admin.user(person.id)}
                                  className="inline-flex items-center gap-1.5"
                                >
                                  <HugeiconsIcon
                                    icon={UserIcon}
                                    strokeWidth={1.75}
                                    className="size-3.5"
                                  />
                                  View profile
                                </Link>
                              </AdminButton>
                            </td>
                          </tr>
                        );
                      })
                    ) : data && !loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          No accounts match these filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Surface>
          </div>
        </div>
      </AdminBody>
    </div>
  );
}
