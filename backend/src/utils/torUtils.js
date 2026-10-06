const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

function latinDigits(value) {
  return String(value).replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)));
}

// Public sources return budgets as both numbers and locale-formatted strings.
// Thai announcement PDFs often use Thai digits (๒๕,๙๙๖,๔๕๔.๘๐). Convert either
// representation into one safe numeric value for charts and MongoDB.
function parseBudget(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = latinDigits(value)
    .replace(/[฿บาท]/g, "")
    .replace(/,/g, "")
    .trim();
  return parseFloat(normalized) || 0;
}

// Announcement notices print the project amount next to "บาท". Column layout
// scrambles the label, so keep the largest baht figure on the page.
function parseAnnouncementBudget(text) {
  const amounts = [...String(text || "").matchAll(
    /([๐-๙0-9][๐-๙0-9,]{2,}(?:\.[๐-๙0-9]+)?)\s*บาท/g,
  )].map((match) => parseBudget(match[1]));
  return amounts.reduce((best, amount) => (amount > best ? amount : best), 0);
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function parseDate(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function budgetYearFromValue(value) {
  const text = String(value || "").trim();
  const four = text.match(/(25\d{2})/);
  if (four) return four[1];
  const two = text.match(/\b(\d{2})\b/);
  if (!two) return undefined;
  const yy = Number(two[1]);
  if (yy < 60 || yy > 80) return undefined;
  return String(2500 + yy);
}

function budgetYearFromRef(refId) {
  const match = String(refId || "").match(/^(\d{2})\d{6,}$/);
  if (!match) return undefined;
  const yy = Number(match[1]);
  if (yy < 60 || yy > 80) return undefined;
  return String(2500 + yy);
}

// Category labels are intentionally broad: they make cross-source budgets comparable.
function classifyCategory(keywordOrTerms) {
  const text = Array.isArray(keywordOrTerms)
    ? keywordOrTerms.join(" ")
    : keywordOrTerms || "";
  const normalizedText = text.toLowerCase();

  if (!text) return "Software Development";
  if (
    text.includes("เว็บไซต์") ||
    text.includes("เว็บ") ||
    normalizedText.includes("website") ||
    normalizedText.includes("web application")
  ) {
    return "Web Application";
  }
  if (
    text.includes("แอปพลิเคชัน") ||
    text.includes("แอพ") ||
    normalizedText.includes("application")
  ) {
    return "Mobile Application";
  }
  if (
    text.includes("ฐานข้อมูล") ||
    text.includes("แพลตฟอร์ม") ||
    normalizedText.includes("database") ||
    normalizedText.includes("platform")
  ) {
    return "Data Platform";
  }
  if (text.includes("ภูมิสารสนเทศ")) {
    return "AI / Analytics";
  }
  return "Software Development";
}

// Shared retry pause keeps source adapters from retrying a transient failure immediately.
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  budgetYearFromRef,
  budgetYearFromValue,
  classifyCategory,
  firstPresent,
  latinDigits,
  parseAnnouncementBudget,
  parseBudget,
  parseDate,
  wait,
};
