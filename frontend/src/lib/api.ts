import { Tor } from "@/types/tor";

const isServer = typeof window === "undefined";
const API_BASE_URL = isServer
  ? process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5175/api"
  : process.env.NEXT_PUBLIC_API_URL;

export async function fetchTors(): Promise<Tor[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/tors`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.error("Failed to fetch TORs:", res.status, res.statusText);
      return [];
    }
    const data = await res.json();
    return data.map(mapBackendTorToFrontendTor);
  } catch (error) {
    console.error("Error fetching TORs:", error);
    return [];
  }
}

export async function fetchTorById(id: string): Promise<Tor | undefined> {
  try {
    const res = await fetch(`${API_BASE_URL}/tors/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return undefined;
    }
    const data = await res.json();
    return mapBackendTorToFrontendTor(data);
  } catch (error) {
    console.error(`Error fetching TOR ${id}:`, error);
    return undefined;
  }
}

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
    integrity: "ok", // Default for now
    budgetThb: data.budgetThb || 0,
    publishedAt: data.publishedAt
      ? new Date(data.publishedAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    deadline: data.deadline || "", // Fallback
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
