const { generateFromParts, generateText, isConfigured, readConfig } = require("@/services/ai/vertexClient");
const { hasUsableTextLayer, readPdfText } = require("@/services/tor/ocr/readPdfText");
const { parseDate } = require("@/utils/torUtils");

const EXTRACT_PROMPT = `You are reading a Thai government procurement plan. The input is either extracted PDF text or a scanned PDF.

Extract only text that is present. If a field is not present, use null or []. Do not invent a project brief, scope, skills, budget, or deadline.

Return JSON only, no markdown, with this shape:
{
  "summaryTh": "short Thai summary of what the notice actually says, or null",
  "summaryEn": "short English summary of the same visible text, or null",
  "requirements": ["visible line items or requirements only"],
  "deadline": "YYYY-MM-DD or null",
  "skills": ["visible software skills only"]
}`;

function parseModelJson(text) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(fenced.slice(start, end + 1));
  } catch {
    return null;
  }
}

function asStringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeExtract(raw) {
  if (!raw || typeof raw !== "object") {
    return { summary: "", summaryTh: "", requirements: [], deadline: undefined, skills: [] };
  }
  return {
    summary: String(raw.summaryEn || raw.summary || "").trim(),
    summaryTh: String(raw.summaryTh || "").trim(),
    requirements: asStringList(raw.requirements),
    deadline: parseDate(raw.deadline),
    skills: asStringList(raw.skills),
  };
}

function structurePlainText(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const requirements = lines
    .filter((line) => /^(\d+[\).\]-]|[-•]|\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23)/.test(line))
    .slice(0, 20);
  return {
    summary: "",
    summaryTh: String(text || "").slice(0, 1200).trim(),
    requirements,
    deadline: undefined,
    skills: [],
  };
}

async function structureWithVertex(prompt, timeoutMs) {
  const result = await generateText({ prompt, timeoutMs });
  if (!result.ok) return result;
  return {
    ok: true,
    extract: normalizeExtract(parseModelJson(result.text)),
    model: result.model || readConfig().model,
    latencyMs: result.latencyMs,
  };
}

async function extractFromScan(pdfBytes) {
  const timeoutMs = Number(process.env.VERTEX_OCR_TIMEOUT_MS) || 90_000;
  const result = await generateFromParts({
    timeoutMs,
    parts: [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: Buffer.from(pdfBytes).toString("base64"),
        },
      },
      { text: EXTRACT_PROMPT },
    ],
  });
  if (!result.ok) return { ok: false, code: result.code, message: result.message, method: "ocr" };
  return {
    ok: true,
    method: "ocr",
    extract: normalizeExtract(parseModelJson(result.text)),
    model: result.model || readConfig().model,
    latencyMs: result.latencyMs,
  };
}

async function extractFromTextLayer(text) {
  const timeoutMs = Number(process.env.VERTEX_OCR_TIMEOUT_MS) || 90_000;
  if (isConfigured()) {
    const structured = await structureWithVertex(
      `${EXTRACT_PROMPT}\n\nPDF text:\n${text.slice(0, 12_000)}`,
      timeoutMs,
    );
    if (structured.ok) {
      return {
        ok: true,
        method: "text",
        extract: structured.extract,
        model: structured.model,
        latencyMs: structured.latencyMs,
      };
    }
  }
  return { ok: true, method: "text", extract: structurePlainText(text) };
}

async function extractPlanPdf(pdfBytes) {
  const text = await readPdfText(pdfBytes);
  if (hasUsableTextLayer(text)) {
    return extractFromTextLayer(text);
  }
  if (!isConfigured()) {
    return {
      ok: false,
      method: "ocr",
      code: "MISCONFIGURED",
      message: "Scan has no text layer and Vertex is not configured",
    };
  }
  return extractFromScan(pdfBytes);
}

module.exports = {
  EXTRACT_PROMPT,
  extractPlanPdf,
  hasUsableTextLayer,
  normalizeExtract,
  parseModelJson,
  structurePlainText,
};
