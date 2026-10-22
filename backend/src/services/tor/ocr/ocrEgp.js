const { unzipSync } = require("fflate");
const { extractPlanPdf, SUMMARY_VERSION } = require("@/services/tor/ocr/extractPlanPdf");
const torRepository = require("@/repositories/torRepository");

const SOURCE = "EGP-PROCESS5";

async function downloadTor(url) {
  const target = new URL(url);
  if (!target.hostname.endsWith(".gprocurement.go.th") || target.protocol !== "https:") {
    throw new Error("Unexpected e-GP document URL");
  }
  const response = await fetch(target, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`e-GP document HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 25_000_000) throw new Error("e-GP document exceeds 25 MB");
  if (bytes.subarray(0, 4).toString() === "%PDF") return { pdf: bytes, fileName: "announcement.pdf" };
  if (bytes.subarray(0, 2).toString() !== "PK") throw new Error("e-GP document is not a PDF or ZIP");
  let expanded = 0;
  const files = unzipSync(bytes, { filter: (file) => {
    if (!file.name.toLowerCase().endsWith(".pdf") || file.originalSize > 20_000_000 || expanded + file.originalSize > 40_000_000) return false;
    expanded += file.originalSize;
    return true;
  } });
  const entries = Object.entries(files).filter(([name, contents]) =>
    name.toLowerCase().endsWith(".pdf") && Buffer.from(contents.subarray(0, 4)).toString() === "%PDF",
  );
  // e-GP ZIPs can contain a large scanned Attach_TOR and a concise, text-layer
  // tor_<project>.pdf. Read the text-layer TOR first so one scan cannot stall sync.
  const rank = (name) => {
    const base = name.split("/").pop();
    return /^tor_/i.test(base) ? 3 : /attach[_-]?tor/i.test(base) ? 2 : /tor/i.test(base) ? 1 : 0;
  };
  entries.sort(([a], [b]) => rank(b) - rank(a));
  if (!entries.length || !rank(entries[0][0])) throw new Error("e-GP ZIP contains no TOR PDF");
  const notice = entries.find(([name]) => /annoudoc/i.test(name));
  return {
    fileName: entries[0][0], pdf: Buffer.from(entries[0][1]),
    noticePdf: notice && notice[0] !== entries[0][0] ? Buffer.from(notice[1]) : undefined,
  };
}

async function enrich(tors = []) {
  const summary = { ocrAttempted: 0, ocrUpdated: 0, ocrSkipped: 0, ocrFailed: 0, updatedTorIds: [] };
  if (process.env.OCR_ENABLED === "false") return { ...summary, ocrSkipped: tors.length, ocrReason: "disabled" };
  const current = new Map((await torRepository.findBySource(SOURCE)).map((tor) => [tor.refId, tor]));
  const max = Number(process.env.OCR_MAX_PER_SYNC) || 27;
  const candidates = tors.filter((tor) => tor.documentUrl && (
    current.get(tor.refId)?.ocr?.status !== "ok" ||
    current.get(tor.refId)?.ocr?.fileUrl !== tor.documentUrl ||
    current.get(tor.refId)?.ocr?.summaryVersion !== SUMMARY_VERSION
  )).sort((a, b) =>
    Number(current.get(a.refId)?.ocr?.status === "failed") - Number(current.get(b.refId)?.ocr?.status === "failed")
  ).slice(0, max);
  for (const tor of candidates.filter((item) => item.documentUrl)) {
    const fileUrl = tor.documentUrl;
    const documentSource = String(fileUrl).includes("/egp-upload-service/") ? "process5-tor" : "process3-tor";
    if (current.get(tor.refId)?.ocr?.status === "ok" && current.get(tor.refId).ocr.fileUrl === fileUrl && current.get(tor.refId).ocr.summaryVersion === SUMMARY_VERSION) {
      summary.ocrSkipped++;
      continue;
    }
    summary.ocrAttempted++;
    try {
      const { pdf, fileName, noticePdf } = await downloadTor(fileUrl);
      const result = await extractPlanPdf(pdf);
      if (!result.ok) throw new Error(result.message);
      let notice;
      if (noticePdf) {
        try { notice = await extractPlanPdf(noticePdf); } catch { /* TOR extraction still succeeds. */ }
      }
      const saved = await torRepository.saveOcr(tor.refId, SOURCE, {
        status: "ok", source: documentSource, method: result.method, fileName, fileUrl,
        model: result.model, summaryVersion: SUMMARY_VERSION, extractedAt: new Date(),
        summary: result.extract.summary || undefined,
        summaryTh: result.extract.summaryTh || undefined,
        requirements: result.extract.requirements,
        skills: result.extract.skills,
        deadline: notice?.ok && notice.extract.deadline || result.extract.deadline,
      });
      summary.ocrUpdated++;
      if (saved?._id) summary.updatedTorIds.push(saved._id);
    } catch (error) {
      summary.ocrFailed++;
      await torRepository.saveOcr(tor.refId, SOURCE, {
        status: "failed", source: documentSource, fileUrl, error: error.message, extractedAt: new Date(),
      });
    }
  }
  summary.ocrSkipped += tors.length - summary.ocrAttempted - summary.ocrSkipped;
  return summary;
}

module.exports = { downloadTor, enrich };
