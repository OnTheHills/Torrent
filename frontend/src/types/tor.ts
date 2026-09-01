import type { AgencyId, DataSourceKind } from "@/config/agencies";

export type { AgencyId, DataSourceKind };

export type TorLifecycle = "draft" | "published" | "awarded";

export type IntegrityStatus = "ok" | "suspicious";

export type TorCategory =
  | "Web Application"
  | "Mobile Application"
  | "System Integration"
  | "Data Platform"
  | "Cybersecurity"
  | "AI / Analytics";

export type NotificationKind = "match" | "risk" | "deadline";

export type BudgetBand = "all" | "lt5" | "5to15" | "gt15";

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
  publishedAt: string;
  deadline: string;
  summary: string;
  summaryTh: string;
  skills: string[];
  requirements: string[];
  /** Public listing the vendor should open (e-GP, OCDS page, etc.). */
  egpUrl: string;
  sourceKind: DataSourceKind;
  procurementMethod?: ProcurementMethod;
  matchScore?: number;
  matchReasons?: string[];
}

export interface ShowcaseEntry {
  id: string;
  title: string;
  vendorName: string;
  category: TorCategory;
  approach: string;
  outcome: string;
  year: number;
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
