"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  AdminBody,
  AdminHero,
  AdminStatus,
  formatWhen,
  useAdminQuery,
} from "@/components/admin/admin-ui";
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
import { cn } from "@/lib/utils";

type AuditItem = {
  _id: string;
  createdAt: string;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  reason?: string;
  changes?: { field: string; before: unknown; after: unknown }[];
};

type Payload = { total: number; items: AuditItem[] };

const ACTION_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "tor.review", label: "Reviews" },
  { value: "tor.update", label: "Edits" },
  { value: "tor.bulk.hide", label: "Bulk hide" },
  { value: "tor.bulk.restore", label: "Bulk restore" },
  { value: "tor.bulk.review", label: "Bulk send to review" },
  { value: "user.update", label: "Users" },
  { value: "sync.start", label: "Syncs" },
  { value: "rules.apply", label: "Rules" },
  { value: "review.rescore", label: "Rescore" },
  { value: "match.retry", label: "Match retries" },
] as const;

const ACTION_LABEL: Record<string, string> = {
  "tor.review": "Reviewed TOR",
  "tor.update": "Edited TOR",
  "tor.bulk.hide": "Bulk hide",
  "tor.bulk.restore": "Bulk restore",
  "tor.bulk.review": "Sent to review",
  "user.update": "Updated user",
  "sync.start": "Started sync",
  "rules.apply": "Applied rules",
  "review.rescore": "Updated scores",
  "match.retry": "Retried match job",
  "integrity.resolve": "Resolved integrity",
};

const TARGET_LABEL: Record<string, string> = {
  tor: "TOR",
  user: "User",
  catalog: "Catalog",
  "match-job": "Match job",
  settings: "Settings",
  sync: "Sync",
  source: "Source",
  vendor: "Vendor",
  classification: "Classification",
};

const SOURCE_NAME: Record<string, string> = {
  dataGo: "data.go e-GP",
  bmaEgp2: "BMA e-GP2",
  egpRss: "e-GP RSS",
  smeAnnouncements: "SME announcements",
  all: "All sources",
};

const FIELD_LABEL: Record<string, string> = {
  budgetThb: "Budget",
  deadline: "Deadline",
  publishedAt: "Announced",
  category: "Category",
  department: "Department",
  status: "Status",
  title: "Title",
  titleTh: "Title (TH)",
  hidden: "Hidden",
  reviewStatus: "Review status",
  confidence: "Confidence",
  role: "Role",
  disabled: "Disabled",
  scored: "Scored",
  vertexScored: "Vertex scored",
  skippedExpired: "Skipped",
  ids: "Records",
};

/** Rescore counters: hide the redundant total; keep vertex + skip, in that order. */
const RESCORE_CHANGE_ORDER = ["vertexScored", "skippedExpired"] as const;
const RESCORE_CHANGE_FIELDS = new Set<string>(RESCORE_CHANGE_ORDER);

const frostSelect =
  "h-10! w-44 shrink-0 rounded-full border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] sm:w-52";

function show(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    if (value.length <= 3) return value.map(String).join(", ");
    return `${value.length} items`;
  }
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  return text.length > 48 ? `${text.slice(0, 45)}…` : text;
}

function actionLabel(action: string) {
  return ACTION_LABEL[action] || action.replaceAll(".", " · ");
}

function targetLabel(type: string) {
  return TARGET_LABEL[type] || type;
}

function fieldLabel(field: string) {
  return FIELD_LABEL[field] || field;
}

function isEmptyChangeValue(value: unknown) {
  return value === null || value === undefined || value === "";
}

function formatChangeValue(change: { before: unknown; after: unknown }) {
  const beforeEmpty = isEmptyChangeValue(change.before);
  const afterEmpty = isEmptyChangeValue(change.after);
  if (beforeEmpty && afterEmpty) return "—";
  // Result counters / newly set fields: show the value, not "— → 7452".
  if (beforeEmpty) return show(change.after);
  if (afterEmpty) return `cleared (${show(change.before)})`;
  return `${show(change.before)} → ${show(change.after)}`;
}

function ChangesCell({ changes }: { changes?: AuditItem["changes"] }) {
  if (!changes?.length) {
    return <span className="text-muted-foreground">—</span>;
  }
  const isRescore = changes.some((change) => RESCORE_CHANGE_FIELDS.has(change.field));
  const filtered = isRescore
    ? RESCORE_CHANGE_ORDER.flatMap((field) =>
        changes.filter((change) => change.field === field),
      )
    : changes;
  const visible = filtered.slice(0, 6);
  const rest = filtered.length - visible.length;
  const title = visible
    .map((change) => `${fieldLabel(change.field)}: ${formatChangeValue(change)}`)
    .join("  ");

  return (
    <p
      className="truncate text-sm leading-snug"
      title={rest > 0 ? `${title}  +${rest} more` : title}
    >
      {visible.map((change, index) => {
        const value = formatChangeValue(change);
        return (
          <span key={change.field}>
            {index > 0 ? "  " : null}
            <span className="font-medium text-foreground">
              {fieldLabel(change.field)}:
            </span>{" "}
            <span className="tabular-nums text-muted-foreground">{value}</span>
          </span>
        );
      })}
      {rest > 0 ? (
        <span className="text-muted-foreground">  +{rest} more</span>
      ) : null}
    </p>
  );
}

function targetHref(item: AuditItem) {
  if (!item.targetId) return null;
  if (item.targetType === "tor" && /^[a-f0-9]{24}$/i.test(item.targetId)) {
    return routes.admin.tor(item.targetId);
  }
  return null;
}

function shortId(id?: string) {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function subjectName(item: AuditItem) {
  const id = item.targetId?.trim();
  if (!id) return null;
  if (item.targetType === "source" || item.targetType === "sync") {
    return SOURCE_NAME[id] || id;
  }
  if (item.targetType === "catalog" && id.toLowerCase() === "catalog") {
    return null;
  }
  return shortId(id);
}

function SubjectCell({ item }: { item: AuditItem }) {
  const kind = targetLabel(item.targetType);
  const name = subjectName(item);
  const text = name ? `${kind}: ${name}` : kind;
  const href = targetHref(item);
  const body = (
    <>
      <span className="font-medium text-foreground">{kind}{name ? ":" : ""}</span>
      {name ? (
        <>
          {" "}
          <span className="text-muted-foreground">{name}</span>
        </>
      ) : null}
    </>
  );
  const className = "block truncate text-sm";
  if (href) {
    return (
      <Link href={href} className={cn(className, "hover:underline")} title={text}>
        {body}
      </Link>
    );
  }
  return (
    <p className={className} title={text}>
      {body}
    </p>
  );
}

export function AuditView() {
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");

  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (action !== "all") params.set("action", action);
    const qs = params.toString();
    return qs ? `/api/admin/audit?${qs}` : "/api/admin/audit";
  }, [query, action]);

  const { data, error, loading } = useAdminQuery<Payload>(path);
  const total = data?.total ?? 0;

  function applyQuery(next: string) {
    setQuery(next);
  }

  return (
    <div>
      <AdminHero
        className="max-w-screen-2xl"
        title="Audit log"
        description="Append-only record of syncs, reviews, edits, role changes, and classification runs. Each entry keeps who, when, what changed, and why."
      />
      <AdminBody className="max-w-screen-2xl space-y-10 md:space-y-12">
        <div className="space-y-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-[1.2]">
              Entries
            </h2>
            <p className="text-sm text-muted-foreground">
              {loading && !data ? (
                "Loading…"
              ) : (
                <>
                  <span className="font-semibold tabular-nums text-foreground">
                    {total.toLocaleString("en-US")}
                  </span>{" "}
                  {total === 1 ? "entry" : "entries"}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <form
              className="relative isolate min-w-0 flex-1 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150"
              onSubmit={(event) => {
                event.preventDefault();
                applyQuery(draftQuery.trim());
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
                placeholder="Search email, record id, or reason"
                className="relative h-10 rounded-full border-0 bg-transparent pr-4 pl-11 shadow-none ring-0 focus-visible:ring-0"
              />
            </form>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger aria-label="Action" className={cn(frostSelect)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-4">
            <AdminStatus loading={loading && !data} error={error} />
            <Surface className="overflow-hidden bg-surface p-0 ring-transparent">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[10%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                    <col className="w-[18%]" />
                    <col className="w-[22%]" />
                    <col className="w-[24%]" />
                  </colgroup>
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-[color-mix(in_srgb,var(--palette-gray-300)_35%,transparent)]">
                      <th className="px-4 py-3 font-medium">Timestamp</th>
                      <th className="px-3 py-3 font-medium">Operator</th>
                      <th className="px-3 py-3 font-medium">Action</th>
                      <th className="px-3 py-3 font-medium">Subject</th>
                      <th className="px-3 py-3 font-medium">Justification</th>
                      <th className="px-4 py-3 font-medium">Field changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.length ? (
                      data.items.map((item) => {
                        return (
                          <tr
                            key={item._id}
                            className="border-t border-[color-mix(in_srgb,var(--palette-gray-300)_28%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,white_45%,transparent)]"
                          >
                            <td className="px-4 py-3 align-top whitespace-nowrap tabular-nums text-muted-foreground">
                              {formatWhen(item.createdAt)}
                            </td>
                            <td className="truncate px-3 py-3 align-top">
                              {item.actorEmail || "system"}
                            </td>
                            <td className="px-3 py-3 align-top font-medium">
                              {actionLabel(item.action)}
                            </td>
                            <td className="min-w-0 px-3 py-3 align-top">
                              <SubjectCell item={item} />
                            </td>
                            <td className="px-3 py-3 align-top">
                              <p
                                className="line-clamp-3 text-sm leading-snug text-muted-foreground"
                                title={item.reason?.trim() || undefined}
                              >
                                {item.reason?.trim() || "—"}
                              </p>
                            </td>
                            <td className="min-w-0 px-4 py-3 align-top">
                              <ChangesCell changes={item.changes} />
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
                          No entries match these filters.
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
