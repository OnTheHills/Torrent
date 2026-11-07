/** Fixed taxonomy for TOR requirement grouping. */
const REQUIREMENT_CATEGORIES = [
  "technical",
  "delivery",
  "compliance",
  "team",
  "other",
];

const CATEGORY_SET = new Set(REQUIREMENT_CATEGORIES);

/** OCR often keeps source list numbers; strip so category regrouping stays clean. */
const LEADING_LIST_MARKER =
  /^(?:\(\s*[0-9๐-๙]{1,2}\s*\)|[0-9๐-๙]{1,2}[.)]|ข้อ(?:ที่)?\s*[0-9๐-๙]{1,2}[.)]?)\s+/u;

function stripLeadingListMarker(text) {
  return String(text || "")
    .trim()
    .replace(LEADING_LIST_MARKER, "")
    .trim();
}

function normalizeCategory(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase();
  return CATEGORY_SET.has(key) ? key : "other";
}

/**
 * Normalize OCR / Vertex requirement rows into a stable shape.
 * Accepts either structured items or parallel flat Thai/English lists.
 */
function normalizeRequirementItems(rawItems, requirements = [], requirementsEn = []) {
  if (Array.isArray(rawItems) && rawItems.length) {
    return rawItems
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const text = stripLeadingListMarker(
          row.text || row.textTh || row.th || "",
        );
        const textEn = stripLeadingListMarker(row.textEn || row.en || "");
        if (!text && !textEn) return null;
        return {
          category: normalizeCategory(row.category),
          text,
          textEn,
        };
      })
      .filter(Boolean)
      .slice(0, 20);
  }

  const th = (Array.isArray(requirements) ? requirements : [])
    .map((item) => stripLeadingListMarker(item))
    .filter(Boolean)
    .slice(0, 20);
  const en = (Array.isArray(requirementsEn) ? requirementsEn : [])
    .map((item) => stripLeadingListMarker(item))
    .filter(Boolean)
    .slice(0, 20);

  return th.map((text, index) => ({
    category: "other",
    text,
    textEn: en[index] || "",
  }));
}

function flatRequirements(items) {
  return (items || []).map((item) => item.text).filter(Boolean);
}

function flatRequirementsEn(items) {
  return (items || []).map((item) => item.textEn).filter(Boolean);
}

/** Group items by category, preserving taxonomy order. */
function groupRequirementItems(items) {
  const buckets = Object.fromEntries(
    REQUIREMENT_CATEGORIES.map((category) => [category, []]),
  );
  for (const item of items || []) {
    const category = normalizeCategory(item.category);
    buckets[category].push(item);
  }
  return REQUIREMENT_CATEGORIES.filter((category) => buckets[category].length).map(
    (category) => ({
      category,
      items: buckets[category],
    }),
  );
}

module.exports = {
  REQUIREMENT_CATEGORIES,
  flatRequirements,
  flatRequirementsEn,
  groupRequirementItems,
  normalizeCategory,
  normalizeRequirementItems,
  stripLeadingListMarker,
};
