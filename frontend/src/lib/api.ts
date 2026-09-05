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

  if (base.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    normalizedPath = normalizedPath.slice(4);
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
    throw new Error(message);
  }

  return data as T;
}

export async function fetchTors(): Promise<Tor[]> {
  try {
    // TOR data can change immediately after manual sync, so do not reuse stale SSR data.
    const response = await fetch(apiUrl("/tors"), { cache: "no-store" });

    if (!response.ok) {
      console.error("Failed to fetch TORs:", response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    return data.map(mapBackendTorToFrontendTor);
  } catch (error) {
    console.error("Error fetching TORs:", error);
    return [];
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

// MongoDB/source field names are not UI field names. This is the sole mapping
// boundary, including defaults for incomplete public-source records.
function mapBackendTorToFrontendTor(data: any): Tor {
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
    publishedAt: data.publishedAt
      ? new Date(data.publishedAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    deadline: data.deadline || "",
    summary: data.summary || data.description || "",
    summaryTh: data.summaryTh || data.description || "",
    skills: data.skillNeededList || [],
    requirements: [],
    egpUrl: data.egpUrl || "",
    sourceKind:
      data.source === "BMA-EGP2"
        ? "bma-egp2"
        : data.source === "SME-GP"
          ? "egp-rss"
          : "html",
    matchScore: 0,
  };
}
