import type { Tor } from "@/types/tor";

// Server-rendered Next.js code cannot reach the host's localhost inside Docker,
// while browser code can. Keep the choice in one place for every API call.
const isServer = typeof window === "undefined";
const API_URL = isServer
  ? process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5175/api"
  : process.env.NEXT_PUBLIC_API_URL || "http://localhost:5175/api";

// Accept both "/auth/me" and "/api/auth/me" callers without producing "/api/api".
function apiUrl(path: string) {
  const base = API_URL.replace(/\/+$/, "");
  let normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (base.endsWith("/api")) {
    if (normalizedPath.startsWith("/api/")) {
      normalizedPath = normalizedPath.slice(4);
    }
  } else if (!normalizedPath.startsWith("/api/")) {
    normalizedPath = `/api${normalizedPath}`;
  }

  return `${base}${normalizedPath}`;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Use this generic client for session-protected JSON endpoints. It includes
  // browser cookies and turns API error bodies into normal JavaScript errors.
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: string }).message)
        : `Request failed (${response.status})`;
    const error = new Error(message) as Error & { status: number; code?: string };
    error.status = response.status;
    if (
      typeof data === "object" &&
      data &&
      "code" in data &&
      typeof (data as { code?: unknown }).code === "string"
    ) {
      error.code = (data as { code: string }).code;
    }
    throw error;
  }

  return data as T;
}

async function requestTors(): Promise<Tor[]> {
  // TOR data can change immediately after manual sync, so do not reuse stale data.
  const response = await fetch(apiUrl("/tors"), { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch TORs (${response.status} ${response.statusText})`);
  }

  const data = await response.json();
  return data.map(mapBackendTorToFrontendTor);
}

export async function fetchTors(): Promise<Tor[]> {
  try {
    return await requestTors();
  } catch (error) {
    console.error("Error fetching TORs:", error);
    return [];
  }
}

// Client queries need rejected requests so React Query can keep retrying while
// the backend container is still completing its optional startup synchronization.
export function fetchTorsForQuery(): Promise<Tor[]> {
  return requestTors();
}

export type StoredMatch = {
  _id: string;
  torId: string | { _id?: string };
  matchPercent: number | string | { $numberDecimal?: string };
  matchReason: string;
  dismissedAt?: string | null;
  updatedAt: string;
};

export function storedMatchScore(value: StoredMatch["matchPercent"]) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return Number(value?.$numberDecimal) || 0;
}

export async function setMatchDismissed(id: string, dismissed: boolean) {
  return api<StoredMatch>(`/tor-matches/mine/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ dismissed }),
  });
}

export function storedMatchTorId(value: StoredMatch["torId"]) {
  if (typeof value === "string") return value;
  return value?._id ?? "";
}

/** TOR ids whose match job is still pending, running, or waiting. */
export async function fetchPendingMatchIds(): Promise<string[]> {
  const response = await fetch(apiUrl("/tor-matches/pending"), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch pending matches (${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data.map(String) : [];
}

export type StoredMatchSummary = {
  score: number;
  reason: string;
};

/** Scores keyed by TOR id for the signed-in vendor; empty when signed out. */
export async function fetchMyMatchScores(): Promise<Record<string, StoredMatchSummary>> {
  try {
    const matches = await api<StoredMatch[]>("/tor-matches/mine");
    return Object.fromEntries(
      matches.map((match) => [
        storedMatchTorId(match.torId),
        {
          score: storedMatchScore(match.matchPercent),
          reason: match.matchReason ?? "",
        },
      ]),
    );
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401 || status === 403 || status === 404) return {};
    throw error;
  }
}

export async function fetchTorById(id: string): Promise<Tor | undefined> {
  try {
    const response = await fetch(apiUrl(`/tors/${id}`), { cache: "no-store" });

    if (!response.ok) return undefined;

    const data = await response.json();
    return mapBackendTorToFrontendTor(data);
  } catch (error) {
    console.error(`Error fetching TOR ${id}:`, error);
    return undefined;
  }
}

const INGEST_SUMMARY_PREFIXES = [
  /^Matched keyword:\s*/i,
  /^BMA e-GP2 plan matched terms:\s*/i,
  /^BMA e-GP2 project matched terms:\s*/i,
  /^e-GP RSS matched terms:\s*/i,
  /^พบคำค้นหา:\s*/,
  /^แผนจัดซื้อจัดจ้าง กทม\. e-GP2 พบคำค้นหา:\s*/,
  /^โครงการ กทม\. e-GP2 พบคำค้นหา:\s*/,
  /^RSS e-GP พบคำค้นหา:\s*/,
];

function splitIngestSummary(value?: string) {
  const text = String(value || "").trim();
  if (!text) return { isIngest: false, listedBecause: "" };

  for (const prefix of INGEST_SUMMARY_PREFIXES) {
    if (prefix.test(text)) {
      return {
        isIngest: true,
        listedBecause: text.replace(prefix, "").trim(),
      };
    }
  }

  return { isIngest: false, listedBecause: "" };
}

// MongoDB/source field names are not UI field names. This is the sole mapping
// boundary, including defaults for incomplete public-source records.
function inferBudgetYear(data: { budgetYear?: string; refId?: string; source?: string }) {
  if (data.budgetYear) return String(data.budgetYear);
  if (data.source !== "BMA-EGP2") return "";
  const match = String(data.refId || "").match(/^(\d{2})\d{6,}$/);
  if (!match) return "";
  const yy = Number(match[1]);
  if (yy < 60 || yy > 80) return "";
  return String(2500 + yy);
}

// Procurement dates are Thailand calendar days. BMA publishes them as midnight
// ICT, which is 17:00 the previous day in UTC, so a UTC date slice is a day early.
const SOURCE_TIME_ZONE = "Asia/Bangkok";

function sourceCalendarDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SOURCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isAnnouncementPdf(url: string) {
  return /view-pdf|\.pdf(?:$|\?)/i.test(url || "");
}

function mapBackendTorToFrontendTor(data: any): Tor {
  const ingestEn = splitIngestSummary(data.summary);
  const ingestTh = splitIngestSummary(data.summaryTh);
  const isIngest = ingestEn.isIngest || ingestTh.isIngest;
  const ocr = data.ocr && typeof data.ocr === "object" ? data.ocr : undefined;
  const ocrDeadline = ocr?.deadline ? sourceCalendarDate(ocr.deadline) : "";

  return {
    id: data._id,
    refId: data.refId || data._id,
    title: data.title,
    titleTh: data.titleTh || data.title,
    agencyId: data.agencyId || "unknown",
    department: data.department || "Unknown Department",
    departmentTh: data.departmentTh || data.department,
    category: data.category || "Uncategorized",
    lifecycle:
      data.status === "published" ? "published" : data.status || "draft",
    integrity: "ok",
    budgetThb: data.budgetThb || 0,
    budgetYear: data.budgetYear || inferBudgetYear(data),
    publishedAt: data.publishedAt
      ? sourceCalendarDate(data.publishedAt)
      : sourceCalendarDate(new Date()),
    deadline: data.deadline ? sourceCalendarDate(data.deadline) : ocrDeadline,
    summary: ocr?.summary || (isIngest ? "" : data.summary || data.description || ""),
    summaryTh:
      ocr?.summaryTh || (isIngest ? "" : data.summaryTh || data.description || ""),
    listedBecause: ingestEn.listedBecause || ingestTh.listedBecause || undefined,
    skills: ocr?.skills?.length ? ocr.skills : data.skillNeededList || [],
    requirements: Array.isArray(ocr?.requirements)
      ? ocr.requirements
      : Array.isArray(data.requirements)
        ? data.requirements
        : [],
    egpUrl: isAnnouncementPdf(data.egpUrl) ? "" : data.egpUrl || "",
    pdfUrl:
      data.torPdfPath ||
      (isAnnouncementPdf(data.egpUrl) ? data.egpUrl : "") ||
      ocr?.fileUrl ||
      "",
    ocr: ocr
      ? {
          status: ocr.status || "",
          method: ocr.method === "text" || ocr.method === "ocr" ? ocr.method : undefined,
          model: ocr.model || undefined,
          summaryVersion:
            typeof ocr.summaryVersion === "number" ? ocr.summaryVersion : undefined,
          extractedAt: ocr.extractedAt,
          fileUrl: ocr.fileUrl || "",
        }
      : undefined,
    sourceKind:
      data.source === "BMA-EGP2"
        ? "bma-egp2"
        : data.source === "EGP-RSS"
          ? "egp-rss"
          : data.source === "SME-GP"
            ? "sme-gp"
            : "html",
  };
}
