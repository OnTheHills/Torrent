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

// Specific topics are checked before generic software words. "application" alone
// is not mobile, and "platform" alone is not a database. Titles that match none
// of these patterns are Others, so a broad search term cannot pose as a specialty.
const CATEGORY_RULES = [
  ["Cybersecurity", [/ไซเบอร์/, /cyber/i, /ความมั่นคงปลอดภัยสารสนเทศ/]],
  [
    "AI / Analytics",
    [
      /ปัญญาประดิษฐ์/,
      /แชทบอท/,
      /chat\s*bot/i,
      /machine\s*learning/i,
      /(?:^|[^a-z])ai(?:[^a-z]|$)/i,
      /วิเคราะห์ข้อมูล/,
      /ประมวลผลข้อมูล/,
    ],
  ],
  [
    "GIS",
    [
      /ภูมิสารสนเทศ/,
      /สารสนเทศภูมิศาสตร์/,
      /geographic\s+information/i,
      /(?:^|[^a-z])gis(?:[^a-z]|$)/i,
    ],
  ],
  [
    "Data Platform",
    [
      /ฐานข้อมูล/,
      /คลังข้อมูล/,
      /data\s*(warehouse|lake|lakehouse)/i,
      /big\s*data/i,
      /database/i,
    ],
  ],
  [
    "Web Application",
    [
      /เว็บไซต์/,
      /เว็บแอป/,
      /เว็บแอพ/,
      /เว็ปแอป/,
      /เว็ปแอพ/,
      /website/i,
      /web\s*app/i,
      /web\s*portal/i,
      /(?:^|[^a-z])portal(?:[^a-z]|$)/i,
    ],
  ],
  [
    "Mobile Application",
    [
      /แอปพลิเคชัน/,
      /แอพพลิเคชัน/,
      /แอปพลิเคชั่น/,
      /แอพพลิเคชั่น/,
      /mobile\s*app/i,
    ],
  ],
  ["Digital Platform", [/แพลตฟอร์ม/, /platform/i]],
];

const NON_SOFTWARE =
  /ระบบนิเวศ|ภาวะผู้นำ|building automation|(?:^|[^a-z])bas(?:[^a-z]|$)|ระบบไฟฟ้า|ระบบประปา|ระบบปรับอากาศ|ระบบระบายน้ำ|ระบบบำบัด|ระบบดับเพลิง|กล้องวงจรปิด/i;
const SOFTWARE = /ซอฟต์แวร์|ซอฟท์แวร์|โปรแกรม|สารสนเทศ|software|e-service/i;
const SOFTWARE_WORK = /พัฒนาระบบ|จัดทำระบบ|จัดทําระบบ|ปรับปรุงระบบ|จ้างทำระบบ|จ้างทําระบบ/;

function classifyCategory(keywordOrTerms) {
  const text = Array.isArray(keywordOrTerms)
    ? keywordOrTerms.join(" ")
    : String(keywordOrTerms || "");
  if (!text.trim()) return "Others";

  for (const [category, patterns] of CATEGORY_RULES) {
    if (patterns.some((pattern) => pattern.test(text))) return category;
  }
  if (NON_SOFTWARE.test(text)) return "Others";
  if (SOFTWARE.test(text) || SOFTWARE_WORK.test(text)) return "Software Development";
  return "Others";
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
