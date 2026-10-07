const { SOURCE } = require("@/constants/bmaConstants");
const {
  announcementFileUrl,
  downloadAnnouncementPdf,
  fetchAnnouncements,
  pickTorAnnouncement,
  projectIdFromUrl,
} = require("@/services/tor/api/bmaEgp2/files");
const {
  extractPlanPdf,
  SUMMARY_VERSION,
} = require("@/services/tor/ocr/extractPlanPdf");
const torRepository = require("@/repositories/torRepository");

function ocrEnabled() {
  return process.env.OCR_ENABLED !== "false";
}

function maxPerSync() {
  const value = Number(process.env.OCR_MAX_PER_SYNC);
  return Number.isFinite(value) && value > 0 ? value : 27;
}

function concurrency() {
  const value = Number(process.env.OCR_CONCURRENCY);
  return Number.isFinite(value) && value > 0 ? value : 2;
}

function alreadyExtracted(current, fileName) {
  return Boolean(
    current?.ocr?.status === "ok" &&
      current?.ocr?.fileName === fileName &&
      current?.ocr?.summaryVersion === SUMMARY_VERSION &&
      (current.ocr.summary ||
        current.ocr.summaryTh ||
        (current.ocr.requirements || []).length),
  );
}

async function mapPool(items, limit, worker) {
  const results = [];
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

async function enrichOne(tor, existingByRef) {
  const projectId = projectIdFromUrl(tor.egpUrl);
  if (!projectId) {
    return { outcome: "skipped", reason: "no-project-id" };
  }

  let announcements;
  try {
    announcements = await fetchAnnouncements(projectId);
  } catch (error) {
    return { outcome: "failed", reason: error.message };
  }

  const announcement = pickTorAnnouncement(announcements);
  const fileName = String(announcement?.projectAnnouncementPath || "").trim();
  const current = existingByRef.get(tor.refId);
  if (!fileName || !announcement?.id) {
    await torRepository.saveOcr(tor.refId, SOURCE, {
      status: "no_file",
      source: "bma-project-tor",
      extractedAt: new Date(),
    });
    return { outcome: "skipped", reason: "no-file" };
  }
  if (alreadyExtracted(current, fileName)) {
    return { outcome: "skipped", reason: "unchanged" };
  }

  const fileUrl = announcementFileUrl(announcement.id, fileName);
  try {
    const pdf = await downloadAnnouncementPdf(fileUrl, projectId);
    const extracted = await extractPlanPdf(pdf);
    if (!extracted.ok) {
      await torRepository.saveOcr(tor.refId, SOURCE, {
        status: "failed",
        source: "bma-project-tor",
        fileName,
        fileUrl,
        error: extracted.message,
        extractedAt: new Date(),
      });
      return { outcome: "failed", reason: extracted.code || extracted.message };
    }
    const saved = await torRepository.saveOcr(tor.refId, SOURCE, {
      status: "ok",
      source: extracted.method === "text" ? "bma-project-tor-text" : "bma-project-tor-ocr",
      method: extracted.method,
      fileName,
      fileUrl,
      model: extracted.model,
      summaryVersion: SUMMARY_VERSION,
      extractedAt: new Date(),
      summary: extracted.extract.summary || undefined,
      summaryTh: extracted.extract.summaryTh || undefined,
      requirements: extracted.extract.requirements.length
        ? extracted.extract.requirements
        : undefined,
      deadline: extracted.extract.deadline,
      skills: extracted.extract.skills.length ? extracted.extract.skills : undefined,
    });
    return { outcome: "updated", torId: saved?._id || tor._id };
  } catch (error) {
    await torRepository.saveOcr(tor.refId, SOURCE, {
      status: "failed",
      source: "bma-project-tor",
      fileName,
      fileUrl,
      error: error.message,
      extractedAt: new Date(),
    });
    return { outcome: "failed", reason: error.message };
  }
}

async function enrich(tors = []) {
  const summary = {
    ocrAttempted: 0,
    ocrUpdated: 0,
    ocrSkipped: 0,
    ocrFailed: 0,
  };
  if (!ocrEnabled()) {
    summary.ocrSkipped = tors.length;
    return { ...summary, ocrReason: "disabled" };
  }
  const candidates = tors.slice(0, maxPerSync());
  const existing = await torRepository.findBySource(SOURCE);
  const existingByRef = new Map(existing.map((tor) => [tor.refId, tor]));
  summary.ocrAttempted = candidates.length;

  const results = await mapPool(candidates, concurrency(), (tor) =>
    enrichOne(tor, existingByRef),
  );
  for (const result of results) {
    if (result.outcome === "updated") summary.ocrUpdated++;
    else if (result.outcome === "failed") summary.ocrFailed++;
    else summary.ocrSkipped++;
  }
  summary.updatedTorIds = results
    .filter((result) => result.outcome === "updated" && result.torId)
    .map((result) => result.torId);
  return summary;
}

module.exports = { alreadyExtracted, enrich, announcementFileUrl, projectIdFromUrl };
