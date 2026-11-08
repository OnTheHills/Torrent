const { generateStructured, isConfigured } = require("@/services/ai/vertexClient");

const THAI_RE = /[\u0E00-\u0E7F]/;

/** Vague flag labels that must never replace a real 1:1 translation. */
const GENERIC_EN_NOTES = new Set([
  "Other procurement signal",
  "other",
]);

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    text: { type: "string" },
  },
  required: ["text"],
  additionalProperties: false,
};

function looksThai(value) {
  return THAI_RE.test(String(value || ""));
}

function isGenericIntegrityNoteEn(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  if (GENERIC_EN_NOTES.has(text)) return true;
  // Joined flag labels from resolveIntegrityFields, e.g. "A · B"
  const parts = text.split(/\s·\s/);
  if (parts.length > 1 && parts.every((part) => GENERIC_EN_NOTES.has(part))) {
    return true;
  }
  return false;
}

/**
 * Literal 1:1 English translation of a Thai Watch out note.
 * Returns "" when Vertex is unavailable or the input is already English.
 */
async function translateIntegrityNoteToEn(noteTh) {
  const thai = String(noteTh || "").trim();
  if (!thai || !looksThai(thai) || !isConfigured()) return "";

  const result = await generateStructured({
    prompt: [
      "Translate the following Thai text into English.",
      "Requirements:",
      "- Literal 1:1 translation of the exact sentences.",
      "- Keep the same facts, order, and meaning.",
      "- Do NOT summarize, soften, or replace with a generic label like \"Other procurement signal\".",
      "- Do NOT add or remove warnings.",
      "Return JSON with key text only.",
      `Thai: ${thai}`,
    ].join("\n"),
    responseJsonSchema: RESPONSE_SCHEMA,
    timeoutMs: Number(process.env.VERTEX_TRANSLATE_TIMEOUT_MS) || 20_000,
  });
  if (!result.ok) return "";

  try {
    const parsed = JSON.parse(result.text);
    const text = String(parsed.text || "").trim().slice(0, 500);
    if (!text || isGenericIntegrityNoteEn(text)) return "";
    return text;
  } catch {
    return "";
  }
}

const {
  normalizeCategory,
  normalizeRequirementItems,
  REQUIREMENT_CATEGORIES,
  stripLeadingListMarker,
} = require("@/services/tor/requirementCategories");

const REQUIREMENT_GROUPS_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: REQUIREMENT_CATEGORIES },
          text: { type: "string" },
          textEn: { type: "string" },
        },
        required: ["category", "text", "textEn"],
        additionalProperties: false,
      },
      maxItems: 20,
    },
  },
  required: ["items"],
  additionalProperties: false,
};

/**
 * Categorize Thai requirement lines and return 1:1 English translations.
 * Preserves source order/count. Returns [] when Vertex is unavailable.
 */
async function categorizeRequirementItems(requirements = []) {
  const source = (Array.isArray(requirements) ? requirements : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 20);
  if (!source.length || !isConfigured()) return [];

  const result = await generateStructured({
    prompt: [
      "Categorize and translate these Thai procurement TOR requirement lines.",
      "For each input line return one object with:",
      "- category: one of technical, delivery, compliance, team, other",
      "  technical = systems/stack/integrations; delivery = scope/deliverables/SLA;",
      "  compliance = security/PDPA/standards; team = staffing/qualifications; other = else",
      "- text: the original Thai line without leading list markers ((1), 1., ข้อ 1)",
      "- textEn: literal 1:1 English translation of that same line (also without leading list markers)",
      "Keep the same order and the same number of items. Do not merge or invent lines.",
      "Return JSON {\"items\":[...]} only.",
      `Thai items: ${JSON.stringify(source)}`,
    ].join("\n"),
    responseJsonSchema: REQUIREMENT_GROUPS_SCHEMA,
    timeoutMs: Number(process.env.VERTEX_TRANSLATE_TIMEOUT_MS) || 45_000,
  });
  if (!result.ok) return [];

  try {
    const parsed = JSON.parse(result.text);
    const items = normalizeRequirementItems(parsed.items);
    if (items.length !== source.length) return [];
    // Force original Thai text so categorization cannot rewrite the source line.
    return items.map((item, index) => ({
      category: normalizeCategory(item.category),
      text: stripLeadingListMarker(source[index]),
      textEn: stripLeadingListMarker(item.textEn || ""),
    }));
  } catch {
    return [];
  }
}

module.exports = {
  categorizeRequirementItems,
  isGenericIntegrityNoteEn,
  looksThai,
  translateIntegrityNoteToEn,
};
