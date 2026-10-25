"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft01Icon,
  BankIcon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Mail01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  AdminBody,
  AdminButton,
  AdminPanel,
  AdminSection,
  AdminStatus,
  ReasonField,
  fieldClass,
  frostButton,
  useAdminQuery,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
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

type PastProject = {
  name?: string;
  description?: string;
  budget?: number | null;
  isGovernment?: boolean | null;
  completedAt?: string | null;
  urls?: string[];
};

type UserDetail = {
  id: string;
  email: string;
  name: string;
  role: "public" | "vendor" | "admin";
  picture?: string;
  disabled: boolean;
  completeness: number;
  profileId: string | null;
  profile: {
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    website: string;
    location: string;
    teamSize: string;
    bio: string;
    vendorCapDescription: string;
    techSkills: string[];
    pastProjects: (PastProject | string)[];
    certificates: Certificate[];
  } | null;
};

type CertDraft = {
  name: string;
  issuer: string;
  status: "pending" | "approved" | "rejected";
  note: string;
};

const frostSelectSmBase =
  "h-8! rounded-full border-0 text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)]";

function roleToneClass(role: UserDetail["role"]) {
  if (role === "vendor") {
    return "bg-[color-mix(in_srgb,var(--palette-blue-200)_55%,transparent)] text-[var(--palette-blue-800)] ring-[color-mix(in_srgb,var(--palette-blue-400)_42%,transparent)]";
  }
  if (role === "admin") {
    return "bg-[color-mix(in_srgb,var(--palette-yellow-300)_48%,transparent)] text-[var(--palette-yellow-800)] ring-[color-mix(in_srgb,var(--palette-yellow-400)_44%,transparent)]";
  }
  return "bg-[color-mix(in_srgb,var(--palette-green-600)_22%,transparent)] text-[var(--palette-green-800)] ring-[color-mix(in_srgb,var(--palette-green-600)_36%,transparent)]";
}

function rolePillClass(role: UserDetail["role"]) {
  return cn(frostSelectSmBase, "ring-1", roleToneClass(role));
}

function accessPillClass(disabled: boolean) {
  return cn(
    frostSelectSmBase,
    "ring-1",
    disabled
      ? "bg-[color-mix(in_srgb,var(--palette-red-400)_28%,transparent)] text-[var(--palette-red-800)] ring-[color-mix(in_srgb,var(--palette-red-400)_44%,transparent)]"
      : "bg-[color-mix(in_srgb,var(--palette-teal-400)_28%,transparent)] text-[var(--palette-teal-800)] ring-[color-mix(in_srgb,var(--palette-teal-400)_44%,transparent)]",
  );
}

function roleLabel(role: UserDetail["role"]) {
  if (role === "vendor") return "Vendor";
  if (role === "admin") return "Admin";
  return "Public";
}

/** Flat listing-style pill; color comes from text (currentColor wash). */
const accountBadgeBase =
  "inline-flex h-8 w-fit shrink-0 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,currentColor_16%,white)] text-sm font-medium";

function roleBadgeTextClass(role: UserDetail["role"]) {
  if (role === "vendor") return "text-[var(--palette-blue-800)]";
  if (role === "admin") return "text-[var(--palette-yellow-800)]";
  return "text-[var(--palette-green-800)]";
}

function AccountTypeBadge({ role }: { role: UserDetail["role"] }) {
  return (
    <span
      className={cn(
        accountBadgeBase,
        "px-2.5",
        roleBadgeTextClass(role),
      )}
    >
      <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-5" />
      {roleLabel(role)}
    </span>
  );
}

function AccountStatusBadge({ disabled }: { disabled: boolean }) {
  return (
    <span
      className={cn(
        accountBadgeBase,
        "pl-1.5 pr-2.5",
        disabled
          ? "text-[var(--palette-red-700)]"
          : "text-[var(--palette-teal-600)]",
      )}
    >
      <HugeiconsIcon
        icon={disabled ? CancelCircleIcon : CheckmarkCircle02Icon}
        strokeWidth={2}
        className="size-5"
      />
      {disabled ? "Disabled" : "Active"}
    </span>
  );
}

function show(value?: string | null) {
  const text = String(value || "").trim();
  return text || "—";
}

function capabilityList(description: string) {
  return description
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDraft(cert: Certificate): CertDraft {
  const status =
    cert.status === "approved" || cert.status === "rejected"
      ? cert.status
      : "pending";
  return {
    name: cert.name || "",
    issuer: cert.issuer || "",
    status,
    note: cert.note || "",
  };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function HeroProfilePhoto({
  picture,
  name,
}: {
  picture?: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(picture?.trim()) && !failed;

  return (
    <div
      className={
        showPhoto
          ? "size-full overflow-hidden rounded-xl border border-2 border-[var(--palette-gray-600)]"
          : "size-full overflow-hidden rounded-xl border border-[var(--palette-gray-400)] bg-[color-mix(in_srgb,var(--palette-gray-200)_55%,transparent)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.72)] backdrop-blur-md backdrop-saturate-150"
      }
      aria-hidden={!showPhoto}
    >
      {showPhoto ? (
        // Google profile URLs; next/image host allowlist not needed for admin.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={picture}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="flex size-full items-center justify-center text-[var(--palette-gray-600)]"
          aria-label={name ? `${name} avatar` : "User avatar"}
        >
          <HugeiconsIcon
            icon={UserIcon}
            strokeWidth={1.5}
            className="size-[42%] opacity-70"
          />
        </div>
      )}
    </div>
  );
}

function certRevision(certificates: Certificate[]) {
  return certificates
    .map(
      (item) =>
        `${item.name || ""}|${item.issuer || ""}|${item.status || ""}|${item.note || ""}`,
    )
    .join(";");
}

function CertificatesPanel({
  userId,
  profileId,
  certificates,
  onChanged,
}: {
  userId: string;
  profileId: string;
  certificates: Certificate[];
  onChanged: () => Promise<void>;
}) {
  const [certDrafts, setCertDrafts] = useState(() => certificates.map(toDraft));
  const [newCert, setNewCert] = useState({ name: "", issuer: "" });
  const [certReason, setCertReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateDraft(index: number, patch: Partial<CertDraft>) {
    setCertDrafts((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  async function saveCertificate(index: number, status?: CertDraft["status"]) {
    const draft = certDrafts[index];
    if (!draft?.name.trim()) {
      setMessage("Certificate name is required.");
      return;
    }
    const reason =
      certReason.trim() ||
      (status === "approved"
        ? "Certificate approved"
        : status === "rejected"
          ? "Certificate rejected"
          : "Certificate updated");
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/admin/certificates", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          userId,
          index,
          name: draft.name.trim(),
          issuer: draft.issuer.trim(),
          status: status || draft.status,
          note: draft.note.trim(),
          reason,
        }),
      });
      setMessage("Certificate saved.");
      setCertReason("");
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Certificate update failed");
    } finally {
      setBusy(false);
    }
  }

  async function addCertificate() {
    if (!newCert.name.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/admin/certificates", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          userId,
          name: newCert.name.trim(),
          issuer: newCert.issuer.trim(),
          status: "pending",
          reason: certReason.trim() || "Certificate added by operator",
        }),
      });
      setNewCert({ name: "", issuer: "" });
      setCertReason("");
      setMessage("Certificate added.");
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not add certificate");
    } finally {
      setBusy(false);
    }
  }

  const pendingCount = certificates.filter(
    (item) => item.status === "pending",
  ).length;

  return (
    <AdminSection
      title="Certificates"
      description="Approve, reject, or edit certificate records. An optional reason overrides the default audit note."
    >
      <AdminPanel>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="max-w-md flex-1">
              <ReasonField value={certReason} onChange={setCertReason} />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {pendingCount} pending
            </span>
          </div>
          {message ? (
            <p className="text-sm text-muted-foreground">{message}</p>
          ) : null}

        {certDrafts.length ? (
          <ul className="space-y-4">
            {certDrafts.map((draft, index) => (
              <li key={`cert-${index}`}>
                <Surface className="space-y-3 bg-[color-mix(in_srgb,white_55%,transparent)] p-4 ring-transparent">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs text-muted-foreground">
                      Name
                      <Input
                        value={draft.name}
                        onChange={(event) =>
                          updateDraft(index, { name: event.target.value })
                        }
                        className="mt-1 h-8"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Issuer
                      <Input
                        value={draft.issuer}
                        onChange={(event) =>
                          updateDraft(index, { issuer: event.target.value })
                        }
                        className="mt-1 h-8"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Status
                      <Select
                        value={draft.status}
                        onValueChange={(status) =>
                          updateDraft(index, {
                            status: status as CertDraft["status"],
                          })
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            frostSelectSmBase,
                            "mt-1 w-full bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)]",
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">pending</SelectItem>
                          <SelectItem value="approved">approved</SelectItem>
                          <SelectItem value="rejected">rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Note
                      <Input
                        value={draft.note}
                        onChange={(event) =>
                          updateDraft(index, { note: event.target.value })
                        }
                        className="mt-1 h-8"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminButton
                      disabled={busy}
                      onClick={() => void saveCertificate(index)}
                    >
                      Save
                    </AdminButton>
                    <AdminButton
                      tone="teal"
                      disabled={busy}
                      onClick={() => void saveCertificate(index, "approved")}
                    >
                      Approve
                    </AdminButton>
                    <AdminButton
                      tone="red"
                      disabled={busy}
                      onClick={() => void saveCertificate(index, "rejected")}
                    >
                      Reject
                    </AdminButton>
                  </div>
                </Surface>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No certificates on this profile yet.
          </p>
        )}

        <form
          className="grid max-w-xl gap-3 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void addCertificate();
          }}
        >
          <Input
            value={newCert.name}
            onChange={(event) =>
              setNewCert((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            placeholder="Certificate name"
            className="h-8"
          />
          <Input
            value={newCert.issuer}
            onChange={(event) =>
              setNewCert((current) => ({
                ...current,
                issuer: event.target.value,
              }))
            }
            placeholder="Issuer"
            className="h-8"
          />
          <AdminButton type="submit" disabled={busy || !newCert.name.trim()}>
            Add
          </AdminButton>
        </form>
        </div>
      </AdminPanel>
    </AdminSection>
  );
}

export function UserDetailView({ id }: { id: string }) {
  const { data, error, loading, reload } = useAdminQuery<UserDetail>(
    `/api/admin/users/${id}`,
  );
  const [accountReason, setAccountReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function changeAccess(disabled: boolean) {
    if (!data || disabled === data.disabled) return;
    if (accountReason.trim().length < 3) {
      setMessage("Enter a reason (3+ characters) before changing access.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/admin/users/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          disabled,
          reason: accountReason.trim(),
        }),
      });
      setAccountReason("");
      setMessage(disabled ? "Account disabled." : "Account enabled.");
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(role: UserDetail["role"]) {
    if (!data || role === data.role) return;
    if (accountReason.trim().length < 3) {
      setMessage("Enter a reason (3+ characters) before changing role.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/admin/users/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role, reason: accountReason.trim() }),
      });
      setAccountReason("");
      setMessage(`Role set to ${role}.`);
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  const profile = data?.profile;
  const capabilities = capabilityList(profile?.vendorCapDescription || "");
  const copyRef = useRef<HTMLDivElement>(null);
  const [photoSide, setPhotoSide] = useState(144);
  const displayName = data?.name || data?.email || "User";

  useLayoutEffect(() => {
    const node = copyRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.height ?? 0);
      if (next <= 0) return;
      setPhotoSide((current) => (current === next ? current : next));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [
    data?.name,
    data?.email,
    data?.role,
    data?.disabled,
    data?.profile?.companyName,
  ]);

  const companyName =
    data?.role === "vendor" ? data.profile?.companyName?.trim() || "" : "";

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden bg-surface text-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(144px+2rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3rem)]">
          <Button asChild size="lg" className={frostButton}>
            <Link href={routes.admin.users}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              Back to users
            </Link>
          </Button>
          <div className="mt-10 flex items-start gap-5 md:gap-8">
            <div
              className="shrink-0 overflow-hidden"
              style={{ width: photoSide, height: photoSide }}
            >
              <HeroProfilePhoto picture={data?.picture} name={displayName} />
            </div>
            <div ref={copyRef} className="min-w-0 flex-1 max-w-5xl space-y-5">
              {data ? (
                <div className="flex flex-wrap items-center gap-2">
                  <AccountTypeBadge role={data.role} />
                  <AccountStatusBadge disabled={data.disabled} />
                </div>
              ) : null}
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl md:leading-[1.15]">
                {displayName}
              </h1>
              {data?.email || companyName ? (
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground">
                  {data?.email ? (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <HugeiconsIcon
                        icon={Mail01Icon}
                        strokeWidth={1.75}
                        className="size-5 shrink-0"
                      />
                      <span className="truncate">{data.email}</span>
                    </span>
                  ) : null}
                  {companyName ? (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <HugeiconsIcon
                        icon={BankIcon}
                        strokeWidth={1.75}
                        className="size-5 shrink-0"
                      />
                      <span className="truncate">{companyName}</span>
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>
      <AdminBody className="space-y-8">
        <AdminStatus loading={loading && !data} error={error} />
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}

        {data ? (
          <>
            {data.role === "vendor" ? (
              <AdminSection
                title="Company & capability"
                description="A read-only view of this vendor's profile as used for opportunity matching."
              >
                <AdminPanel>
                  {!profile ? (
                    <p className="text-sm text-muted-foreground">
                      This account has not saved a vendor profile yet.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <DetailRow
                          label="Company"
                          value={show(profile.companyName)}
                        />
                        <DetailRow
                          label="Company email"
                          value={show(profile.companyEmail)}
                        />
                        <DetailRow
                          label="Phone"
                          value={show(profile.companyPhone)}
                        />
                        <DetailRow
                          label="Website"
                          value={show(profile.website)}
                        />
                        <DetailRow
                          label="Location"
                          value={show(profile.location)}
                        />
                        <DetailRow
                          label="Team size"
                          value={show(profile.teamSize)}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bio</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                          {show(profile.bio)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Capabilities
                        </p>
                        {capabilities.length ? (
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {capabilities.map((item) => (
                              <li
                                key={item}
                                className="rounded-full bg-[color-mix(in_srgb,var(--palette-gray-200)_70%,transparent)] px-3 py-1 text-xs font-medium"
                              >
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm">—</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Technologies
                        </p>
                        {profile.techSkills.length ? (
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {profile.techSkills.map((item) => (
                              <li
                                key={item}
                                className="rounded-full bg-[color-mix(in_srgb,var(--palette-teal-100)_70%,transparent)] px-3 py-1 text-xs font-medium text-[var(--palette-teal-800)]"
                              >
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm">—</p>
                        )}
                      </div>
                    </div>
                  )}
                </AdminPanel>
              </AdminSection>
            ) : null}

            {data.role === "vendor" ? (
              <AdminSection
                title="Past projects"
                description="Similar past work the vendor submitted for procurement fit and matching."
              >
                {!profile ? (
                  <AdminPanel>
                    <p className="text-sm text-muted-foreground">
                      This account has not saved a vendor profile yet.
                    </p>
                  </AdminPanel>
                ) : profile.pastProjects.length ? (
                  <div className="space-y-4">
                    {profile.pastProjects.map((project, index) => {
                      if (typeof project === "string") {
                        return (
                          <AdminPanel key={`${project}-${index}`}>
                            <p className="text-base font-semibold tracking-tight">
                              {project}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Legacy entry — only a project name was saved.
                            </p>
                          </AdminPanel>
                        );
                      }

                      const urls = (project.urls || []).filter(Boolean);
                      const sector =
                        project.isGovernment === true
                          ? "Government"
                          : project.isGovernment === false
                            ? "Private"
                            : "—";
                      const budget =
                        project.budget != null
                          ? `฿${project.budget.toLocaleString("en-US")}`
                          : "—";
                      const completed = (() => {
                        const raw = project.completedAt
                          ? String(project.completedAt).slice(0, 10)
                          : "";
                        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
                        return match
                          ? `${match[3]}/${match[2]}/${match[1]}`
                          : "—";
                      })();

                      return (
                        <AdminPanel key={`${project.name}-${index}`}>
                          <div className="space-y-5">
                            <div>
                              <p className="text-base font-semibold tracking-tight">
                                {show(project.name)}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                                {show(project.description)}
                              </p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                              <DetailRow label="Budget (THB)" value={budget} />
                              <DetailRow label="Project sector" value={sector} />
                              <DetailRow
                                label="Completed date"
                                value={completed}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Project URLs
                              </p>
                              {urls.length ? (
                                <ul className="mt-2 flex flex-wrap gap-2">
                                  {urls.map((url) => (
                                    <li key={url}>
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex max-w-full items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-foreground underline-offset-2 hover:underline"
                                      >
                                        <span className="truncate">{url}</span>
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-1 text-sm">—</p>
                              )}
                            </div>
                          </div>
                        </AdminPanel>
                      );
                    })}
                  </div>
                ) : (
                  <AdminPanel>
                    <p className="text-sm text-muted-foreground">
                      No past projects have been added to this profile yet.
                    </p>
                  </AdminPanel>
                )}
              </AdminSection>
            ) : null}

            {data.profileId && profile ? (
              <CertificatesPanel
                key={`${data.profileId}:${certRevision(profile.certificates)}`}
                userId={data.id}
                profileId={data.profileId}
                certificates={profile.certificates}
                onChanged={reload}
              />
            ) : (
              <AdminSection
                title="Certificates"
                description="Approve, reject, or edit certificate records. An optional reason overrides the default audit note."
              >
                <AdminPanel>
                  <p className="text-sm text-muted-foreground">
                    Certificates appear after the vendor creates a profile.
                  </p>
                </AdminPanel>
              </AdminSection>
            )}

            <AdminSection
              title="Manage access"
              description="Change this account's role or sign-in access. Every update requires a short reason for the audit log."
            >
              <AdminPanel>
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-x-4 gap-y-3">
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        Account type
                      </p>
                      <Select
                        value={data.role}
                        onValueChange={(role) =>
                          void changeRole(role as UserDetail["role"])
                        }
                      >
                        <SelectTrigger
                          aria-label="Account type"
                          className={cn(rolePillClass(data.role), "w-[7.5rem]")}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        Sign-in access
                      </p>
                      <Select
                        value={data.disabled ? "disabled" : "active"}
                        onValueChange={(value) =>
                          void changeAccess(value === "disabled")
                        }
                      >
                        <SelectTrigger
                          aria-label="Sign-in access"
                          className={cn(
                            accessPillClass(data.disabled),
                            "w-[7.5rem]",
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted-foreground">
                      Reason for audit log
                    </span>
                    <textarea
                      value={accountReason}
                      onChange={(event) => {
                        setAccountReason(event.target.value);
                        const node = event.currentTarget;
                        node.style.height = "0px";
                        node.style.height = `${node.scrollHeight}px`;
                      }}
                      rows={2}
                      placeholder="Briefly explain why this change is being made"
                      className={cn(
                        fieldClass,
                        "min-h-[2.75rem] h-auto resize-y overflow-hidden py-2",
                      )}
                    />
                  </label>
                </div>
              </AdminPanel>
            </AdminSection>
          </>
        ) : null}
      </AdminBody>
    </div>
  );
}
