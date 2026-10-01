// Public sources return budgets as both numbers and locale-formatted strings.
// Convert either representation into one safe numeric value for charts and MongoDB.
function parseBudget(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = value
    .toString()
    .replace(/[฿บาท]/g, "")
    .replace(/,/g, "")
    .trim();
  return parseFloat(normalized) || 0;
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function parseDate(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
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
  classifyCategory,
  firstPresent,
  parseBudget,
  parseDate,
  wait,
};
