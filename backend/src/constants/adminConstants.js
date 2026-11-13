const SOURCES = [
  { key: "dataGo", label: "data.go e-GP", source: "DATA-GO-EGP" },
  { key: "bmaEgp2", label: "BMA e-GP2", source: "BMA-EGP2" },
  { key: "egpRss", label: "e-GP RSS", source: "EGP-RSS" },
  { key: "smeAnnouncements", label: "SME-GP", source: "SME-GP" },
];

const EDITABLE = [
  "title",
  "titleTh",
  "category",
  "budgetThb",
  "budgetYear",
  "deadline",
  "publishedAt",
  "status",
  "department",
  "departmentTh",
  "summary",
  "summaryTh",
  "hidden",
];

const REVIEW_FIELDS = ["budgetThb", "deadline", "category", "department", "departmentTh", "status", "publishedAt"];

const REVIEW_SORT = {
  closingFirst: null,
  confidenceAsc: { confidence: 1, publishedAt: -1 },
  confidenceDesc: { confidence: -1, publishedAt: -1 },
  newest: { publishedAt: -1 },
  deadlineAsc: { deadline: 1, confidence: 1 },
  budgetDesc: { budgetThb: -1, confidence: 1 },
};

const RECORDS_SORT = {
  newest: { publishedAt: -1 },
  oldest: { publishedAt: 1 },
  budgetDesc: { budgetThb: -1, publishedAt: -1 },
  confidenceDesc: { confidence: -1, publishedAt: -1 },
  confidenceAsc: { confidence: 1, publishedAt: -1 },
};

const PDF_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const TH_MONTHS = {
  มกราคม: "Jan",
  กุมภาพันธ์: "Feb",
  มีนาคม: "Mar",
  เมษายน: "Apr",
  พฤษภาคม: "May",
  มิถุนายน: "Jun",
  กรกฎาคม: "Jul",
  สิงหาคม: "Aug",
  กันยายน: "Sep",
  ตุลาคม: "Oct",
  พฤศจิกายน: "Nov",
  ธันวาคม: "Dec",
};

const DAY = 24 * 60 * 60 * 1000;

const OPEN_STATUSES = new Set(["open", "published", "draft", "closing"]);

const CLOSED_STATUSES = new Set(["awarded", "cancelled", "closed", "winner"]);

const RECENT_WITHOUT_DEADLINE_MS = 90 * DAY;

const OPEN_STAGES = new Set(["closing", "open", "draft"]);

const TERMINAL_STAGES = new Set(["closed", "awarded", "cancelled"]);

const INTEGRITY_FLAG_LABELS = {
  "short-window": "Bidding window under 3 days",
  "deadline-before-publish": "Deadline is before the announcement",
  "awarded-without-budget": "Awarded with no budget",
  "budget-high": "Budget is more than 3× the category median",
  "budget-low": "Budget is under a quarter of the category median",
  other: "Other procurement signal",
};

module.exports = {
  SOURCES, EDITABLE, REVIEW_FIELDS, REVIEW_SORT, RECORDS_SORT, PDF_USER_AGENT, TH_MONTHS, DAY, OPEN_STATUSES, CLOSED_STATUSES, RECENT_WITHOUT_DEADLINE_MS, OPEN_STAGES, TERMINAL_STAGES, INTEGRITY_FLAG_LABELS,
};
