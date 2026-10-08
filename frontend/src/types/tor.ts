import type { AgencyId, DataSourceKind } from "@/config/agencies";

export type { AgencyId, DataSourceKind };

export type TorLifecycle = "draft" | "published" | "awarded";

export type IntegrityStatus = "ok" | "suspicious";

export type TorCategory = string;

export type NotificationKind = "match" | "risk" | "deadline";

export type BudgetBand = "all" | "lt5" | "5to15" | "gt15";

export type ListingSort = "newest" | "oldest" | "budgetDesc" | "budgetAsc";

export function parseListingSort(value?: string): ListingSort {
  if (
    value === "oldest" ||
    value === "budgetDesc" ||
    value === "budgetAsc"
  ) {
    return value;
  }
  return "newest";
}

export function parseListingLifecycle(value?: string): TorLifecycle | "all" {
  if (value === "draft" || value === "published" || value === "awarded") {
    return value;
  }
  return "all";
}

export type ListingSource = DataSourceKind | "all";

export function parseListingSource(value?: string): ListingSource {
  if (
    value === "egp-rss" ||
    value === "sme-gp" ||
    value === "bma-egp2" ||
    value === "bma-ocds" ||
    value === "html"
  ) {
    return value;
  }
  return "all";
}

export type ProcurementMethod = "e-Bidding" | "e-Selection" | "Specific";

export type PriceAnalysisStatus = "above" | "near" | "below";

export interface Tor {
  id: string;
  refId: string;
  title: string;
  titleTh: string;
  agencyId: AgencyId;
  department: string;
  departmentTh: string;
  category: TorCategory;
  lifecycle: TorLifecycle;
  integrity: IntegrityStatus;
  budgetThb: number;
  budgetYear?: string;
  publishedAt: string;
  deadline: string;
  summary: string;
  summaryTh: string;
  /** Ingest search term that put this row in the catalog — not a project brief. */
  listedBecause?: string;
  skills: string[];
  requirements: string[];
  /** Public listing the vendor should open (e-GP project page, OCDS page, etc.). */
  egpUrl: string;
  /** Announcement or TOR PDF, separate from the listing page. */
  pdfUrl?: string;
  sourceKind: DataSourceKind;
  ocr?: {
    status: string;
    method?: "text" | "ocr";
    model?: string;
    summaryVersion?: number;
    extractedAt?: string;
    fileUrl?: string;
  };
  procurementMethod?: ProcurementMethod;
  matchScore?: number;
  /** Vertex reason this TOR fits the signed-in studio. */
  matchInsight?: string;
  /** True while this listing is still in the match queue. */
  matchPending?: boolean;
  matchReasons?: string[];
}

export interface BudgetBenchmark {
  category: TorCategory;
  department: string;
  year: number;
  minThb: number;
  medianThb: number;
  maxThb: number;
  count: number;
}

export interface VendorMatch {
  id: string;
  torId: string;
  matchedAt: string;
  reasons: string[];
  matchScore: number;
}

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  torId: string;
  title: string;
  titleTh: string;
  body: string;
  bodyTh: string;
  createdAt: string;
  read: boolean;
  matchScore?: number;
  skills: string[];
}

export interface SuspiciousMonthStat {
  monthKey: string;
  monthEn: string;
  monthTh: string;
  count: number;
}

export interface PlatformStats {
  totalTors: number;
  softwareTors: number;
  suspiciousTors: number;
  newThisWeek: number;
  totalDelta: string;
  softwareDelta: string;
  suspiciousDelta: string;
  newDelta: string;
}
