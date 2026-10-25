const { execFile } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { promisify } = require("node:util");

const TOR = require("@/models/TOR");
const User = require("@/models/User");
const VendorProfile = require("@/models/VendorProfile");
const SyncRun = require("@/models/SyncRun");
const AuditLog = require("@/models/AuditLog");
const AdminSettings = require("@/models/AdminSettings");
const TorMatchJob = require("@/models/TorMatchJob");
const { classifyCategory } = require("@/utils/torUtils");
const { matchingSoftwareTerms } = require("@/services/tor/api/dataGo/adapter");
const classification = require("@/services/admin/classification");
const { record, requireReason } = require("@/services/admin/audit");

const execFileAsync = promisify(execFile);
const {
  accuracyFromReviews,
  closingWindow,
  confidenceOf,
  eligibilityFilter,
  integrityReasons,
  isReviewEligible,
  latestRunsBySource,
  resolveIntegrityFields,
  reviewBand,
  sourceVerdict,
  stageClauses,
} = require("@/services/admin/scoring");
const { isConfigured: vertexConfigured } = require("@/services/ai/vertexClient");
const { scoreWithVertex } = require("@/services/tor/scoreWithVertex");
const { categoryMedians } = require("@/services/admin/scoreReviewTors");

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

function thaiDate(value) {
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T00:00:00+07:00`);
  return new Date(text);
}

function queueFilter(settings, now = new Date()) {
  return {
    hidden: { $ne: true },
    reviewStatus: { $nin: ["approved", "rejected", "auto"] },
    $and: [
      eligibilityFilter(now),
      {
        $or: [
          { reviewStatus: { $in: ["review", "manual"] } },
          { confidence: { $lt: settings.autoThreshold } },
          {
            confidence: null,
            $or: [
              { budgetThb: { $in: [null, 0] } },
              { budgetThb: { $exists: false } },
              { deadline: null },
              { deadline: { $exists: false } },
              { publishedAt: null },
              { publishedAt: { $exists: false } },
            ],
          },
        ],
      },
    ],
  };
}

function isAnnouncementPdf(url) {
  return /view-pdf|\.pdf(?:$|\?)/i.test(String(url || ""));
}

function resolvePdfUrl(tor) {
  return (
    tor.torPdfPath ||
    (isAnnouncementPdf(tor.egpUrl) ? tor.egpUrl : "") ||
    tor.ocr?.fileUrl ||
    ""
  );
}

function present(tor) {
  const scored = confidenceOf(tor);
  return {
    id: tor._id,
    refId: tor.refId,
    title: tor.titleTh || tor.title,
    source: tor.source,
    department: tor.departmentTh || tor.department,
    category: tor.category,
    status: tor.status,
    budgetThb: tor.budgetThb || 0,
    budgetYear: tor.budgetYear,
    publishedAt: tor.publishedAt,
    deadline: tor.deadline,
    confidence: tor.confidence ?? scored.confidence,
    reviewStatus: tor.reviewStatus || reviewBand(tor.confidence ?? scored.confidence),
    reviewMissing: tor.reviewMissing?.length ? tor.reviewMissing : scored.missing,
    reviewScoreSource: tor.reviewScoreSource || null,
    reviewScoreReason: tor.reviewScoreReason || "",
    reviewScoredAt: tor.reviewScoredAt || null,
    hidden: Boolean(tor.hidden),
    hiddenReason: tor.hiddenReason,
    egpUrl: tor.egpUrl,
    pdfUrl: resolvePdfUrl(tor),
    integrityStatus: tor.integrityStatus || "clear",
    integrityFlags: Array.isArray(tor.integrityFlags)
      ? tor.integrityFlags
      : tor.integrityReason
        ? [tor.integrityReason]
        : [],
    integrityReason: tor.integrityReason,
    integrityNote: tor.integrityNote,
  };
}

const REVIEW_SORT = {
  closingFirst: null,
  confidenceAsc: { confidence: 1, publishedAt: -1 },
  confidenceDesc: { confidence: -1, publishedAt: -1 },
  newest: { publishedAt: -1 },
  deadlineAsc: { deadline: 1, confidence: 1 },
  budgetDesc: { budgetThb: -1, confidence: 1 },
};

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) || 0 }, () => run());
  await Promise.all(workers);
  return results;
}

async function overview() {
  const settings = await classification.readSettings();
  const [tracked, hidden, queue, runs, accuracyLogs, departments] = await Promise.all([
    TOR.countDocuments({ hidden: { $ne: true } }),
    TOR.countDocuments({ hidden: true }),
    TOR.countDocuments(queueFilter(settings)),
    SyncRun.find().sort({ startedAt: -1 }).limit(12).lean(),
    AuditLog.find({ action: "tor.review" }).select("checked changes").lean(),
    TOR.distinct("departmentTh", { hidden: { $ne: true } }),
  ]);
  const latest = latestRunsBySource(
    await SyncRun.find().sort({ startedAt: -1 }).limit(80).lean(),
    SOURCES,
  );
  return {
    tracked,
    hidden,
    queue,
    departments: departments.filter(Boolean).length,
    accuracy: accuracyFromReviews(accuracyLogs),
    thresholds: {
      auto: settings.autoThreshold,
      review: settings.reviewThreshold,
    },
    sources: SOURCES.map((source) => ({
      ...source,
      verdict: sourceVerdict(latest.get(source.key)),
      lastRun: latest.get(source.key) || null,
    })),
    recentRuns: runs,
  };
}

async function sources() {
  const latestRuns = await SyncRun.find().sort({ startedAt: -1 }).limit(80).lean();
  const latest = latestRunsBySource(latestRuns, SOURCES);
  const counts = await TOR.aggregate([
    { $group: { _id: "$source", count: { $sum: 1 } } },
  ]);
  const bySource = new Map(counts.map((row) => [row._id, row.count]));
  return {
    sources: SOURCES.map((source) => ({
      ...source,
      count: bySource.get(source.source) || 0,
      verdict: sourceVerdict(latest.get(source.key)),
      lastRun: latest.get(source.key) || null,
    })),
    runs: latestRuns,
  };
}

function csv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function reviewQueue({
  q = "",
  source = "",
  category = "",
  year = "",
  band = "",
  stage = "",
  sort = "closingFirst",
  limit = 40,
  skip = 0,
} = {}) {
  const settings = await classification.readSettings();
  const filter = queueFilter(settings);
  const extras = [];
  const sources = csv(source);
  const categories = csv(category);
  const years = csv(year);
  const bands = csv(band).filter((item) => item === "review" || item === "manual");
  const stages = csv(stage);
  if (sources.length) extras.push({ source: { $in: sources } });
  if (categories.length) extras.push({ category: { $in: categories } });
  if (years.length) extras.push({ budgetYear: { $in: years } });
  const stageFilter = stageClauses(stages);
  if (stageFilter) extras.push(stageFilter);
  if (bands.length) {
    // Match stored band or derive from confidence when Score catalog has not run yet.
    const bandClauses = [];
    if (bands.includes("manual")) {
      bandClauses.push(
        { reviewStatus: "manual" },
        { confidence: { $lt: settings.reviewThreshold } },
        { confidence: null },
      );
    }
    if (bands.includes("review")) {
      bandClauses.push(
        { reviewStatus: "review" },
        {
          confidence: {
            $gte: settings.reviewThreshold,
            $lt: settings.autoThreshold,
          },
        },
      );
    }
    extras.push({ $or: bandClauses });
  }
  if (q) {
    extras.push({
      $or: [{ title: new RegExp(q, "i") }, { titleTh: new RegExp(q, "i") }, { refId: q }],
    });
  }
  if (extras.length) filter.$and = [...(filter.$and || []), ...extras];
  const sortKey = REVIEW_SORT[sort] !== undefined ? sort : "closingFirst";
  const pageSize = Math.min(Number(limit) || 40, 100);
  const skipCount = Number(skip) || 0;

  let rows;
  let total;
  if (sortKey === "closingFirst") {
    const { today, until } = closingWindow();
    const [aggregated, count] = await Promise.all([
      TOR.aggregate([
        { $match: filter },
        {
          $addFields: {
            closingSoon: {
              $cond: [
                {
                  $and: [
                    { $ne: [{ $ifNull: ["$deadline", null] }, null] },
                    { $gte: ["$deadline", today] },
                    { $lte: ["$deadline", until] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
        { $sort: { closingSoon: -1, confidence: 1, deadline: 1, publishedAt: -1 } },
        { $skip: skipCount },
        { $limit: pageSize },
      ]),
      TOR.countDocuments(filter),
    ]);
    rows = aggregated;
    total = count;
  } else {
    const sortSpec = REVIEW_SORT[sortKey];
    [rows, total] = await Promise.all([
      TOR.find(filter).sort(sortSpec).skip(skipCount).limit(pageSize).lean(),
      TOR.countDocuments(filter),
    ]);
  }

  const yearRows = await TOR.distinct("budgetYear", queueFilter(settings));
  return {
    total,
    items: rows.map(present),
    thresholds: settings,
    budgetYears: yearRows.filter(Boolean).sort(),
  };
}

async function rescore(user, reasonInput) {
  const reason = requireReason(reasonInput);
  const settings = await classification.readSettings();
  const medians = await categoryMedians();
  const now = new Date();
  const cursor = TOR.find()
    .select(
      "budgetThb deadline category department departmentTh publishedAt title titleTh status source summary summaryTh ocr reviewStatus",
    )
    .cursor();
  let scored = 0;
  let skippedExpired = 0;
  let ops = [];
  const vertexCandidates = [];

  for await (const tor of cursor) {
    if (tor.reviewStatus === "approved" || tor.reviewStatus === "rejected") continue;
    const heuristic = confidenceOf(tor);
    const integrityFlags = integrityReasons(tor, medians.get(tor.category));
    const integrity = resolveIntegrityFields(integrityFlags);
    const band = reviewBand(
      heuristic.confidence,
      settings.autoThreshold,
      settings.reviewThreshold,
    );
    const eligible = isReviewEligible(tor, now);
    if (!eligible) skippedExpired += 1;
    ops.push({
      updateOne: {
        filter: { _id: tor._id },
        update: {
          $set: {
            confidence: heuristic.confidence,
            reviewMissing: heuristic.missing,
            reviewStatus: band,
            reviewScoreSource: "heuristic",
            reviewScoreReason: heuristic.missing.length
              ? `Missing ${heuristic.missing.join(", ")}`
              : "Heuristic complete",
            reviewScoredAt: now,
            ...integrity,
          },
        },
      },
    });
    if (eligible && (band === "review" || band === "manual")) {
      vertexCandidates.push({
        tor,
        heuristic: { ...heuristic, integrityFlags },
      });
    }
    if (ops.length >= 500) {
      await TOR.bulkWrite(ops);
      scored += ops.length;
      ops = [];
    }
  }
  if (ops.length) {
    await TOR.bulkWrite(ops);
    scored += ops.length;
  }

  let vertexScored = 0;
  if (vertexCandidates.length && vertexConfigured()) {
    const concurrency = Math.max(1, Math.min(5, Number(process.env.VERTEX_SCORE_CONCURRENCY) || 3));
    const vertexOps = [];
    await mapPool(vertexCandidates, concurrency, async ({ tor, heuristic }) => {
      const result = await scoreWithVertex(tor, heuristic);
      if (!result.ok) return;
      const confidence = result.confidence;
      const missing = result.issues.length ? result.issues : heuristic.missing;
      const integrity = resolveIntegrityFields(heuristic.integrityFlags || [], result);
      vertexOps.push({
        updateOne: {
          filter: { _id: tor._id },
          update: {
            $set: {
              confidence,
              reviewMissing: missing,
              reviewStatus: reviewBand(
                confidence,
                settings.autoThreshold,
                settings.reviewThreshold,
              ),
              reviewScoreSource: "vertex",
              reviewScoreReason: result.reason,
              reviewScoredAt: new Date(),
              ...integrity,
            },
          },
        },
      });
      vertexScored += 1;
    });
    if (vertexOps.length) await TOR.bulkWrite(vertexOps);
  }

  await record(user, {
    action: "review.rescore",
    targetType: "catalog",
    reason,
    changes: [
      { field: "scored", before: null, after: scored },
      { field: "vertexScored", before: null, after: vertexScored },
      { field: "skippedExpired", before: null, after: skippedExpired },
    ],
  });
  return { scored, vertexScored, skippedExpired };
}

function changesFor(before, after, fields) {
  return fields
    .filter((field) => String(before?.[field] ?? "") !== String(after?.[field] ?? ""))
    .map((field) => ({ field, before: before?.[field] ?? null, after: after?.[field] ?? null }));
}

async function reviewTor(id, user, body) {
  const reason = requireReason(body.reason);
  const decision = body.decision;
  if (!["approve", "fix", "reject"].includes(decision)) {
    const error = new Error("Decision must be approve, fix, or reject.");
    error.statusCode = 400;
    throw error;
  }
  const current = await TOR.findById(id);
  if (!current) {
    const error = new Error("TOR not found.");
    error.statusCode = 404;
    throw error;
  }
  const before = current.toObject();
  const patch = {};
  if (decision === "fix" && body.fields && typeof body.fields === "object") {
    for (const field of REVIEW_FIELDS) {
      if (body.fields[field] !== undefined && body.fields[field] !== "") patch[field] = body.fields[field];
    }
    if (patch.budgetThb !== undefined) patch.budgetThb = Number(patch.budgetThb) || 0;
    if (patch.deadline) patch.deadline = thaiDate(patch.deadline);
    if (patch.publishedAt) patch.publishedAt = thaiDate(patch.publishedAt);
  }
  patch.reviewStatus = decision === "reject" ? "rejected" : "approved";
  patch.reviewNote = reason;
  patch.reviewedAt = new Date();
  patch.reviewedBy = user.sub;
  patch.confidence = decision === "reject" ? before.confidence : 100;
  if (decision === "reject") {
    patch.hidden = true;
    patch.hiddenReason = "review";
  }
  const updated = await TOR.findByIdAndUpdate(id, patch, { returnDocument: "after" });
  const changes = changesFor(before, updated.toObject(), [...REVIEW_FIELDS, "hidden", "reviewStatus"]);
  await record(user, {
    action: "tor.review",
    targetType: "tor",
    targetId: id,
    reason,
    checked: REVIEW_FIELDS,
    changes,
  });
  return present(updated.toObject());
}

const RECORDS_SORT = {
  newest: { publishedAt: -1 },
  oldest: { publishedAt: 1 },
  budgetDesc: { budgetThb: -1, publishedAt: -1 },
  confidenceDesc: { confidence: -1, publishedAt: -1 },
  confidenceAsc: { confidence: 1, publishedAt: -1 },
};

async function searchTors(query) {
  const filter = {};
  const extras = [];
  const sources = csv(query.source);
  const years = csv(query.year);
  const stages = csv(query.stage);
  const reviews = csv(query.review);
  const visibility = csv(query.visibility);
  const integrity = csv(query.integrity);
  if (sources.length) extras.push({ source: { $in: sources } });
  if (years.length) extras.push({ budgetYear: { $in: years } });
  if (reviews.length) extras.push({ reviewStatus: { $in: reviews } });
  if (query.status) extras.push({ status: query.status });
  const stageFilter = stageClauses(stages);
  if (stageFilter) extras.push(stageFilter);

  const wantVisible = visibility.includes("visible");
  const wantHidden = visibility.includes("hidden");
  if (wantVisible && !wantHidden) extras.push({ hidden: { $ne: true } });
  else if (wantHidden && !wantVisible) extras.push({ hidden: true });
  else if (query.hidden === "true") extras.push({ hidden: true });
  else if (query.hidden === "false") extras.push({ hidden: { $ne: true } });

  const wantWatch = integrity.includes("watch");
  const wantClear = integrity.includes("clear");
  if (wantWatch && !wantClear) {
    extras.push({ integrityStatus: { $in: ["flagged", "confirmed"] } });
  } else if (wantClear && !wantWatch) {
    extras.push({
      $or: [
        { integrityStatus: "clear" },
        { integrityStatus: "dismissed" },
        { integrityStatus: { $exists: false } },
        { integrityStatus: null },
      ],
    });
  }

  if (query.q) {
    extras.push({
      $or: [
        { title: new RegExp(query.q, "i") },
        { titleTh: new RegExp(query.q, "i") },
        { refId: query.q },
        { department: new RegExp(query.q, "i") },
        { departmentTh: new RegExp(query.q, "i") },
      ],
    });
  }
  if (extras.length) filter.$and = extras;

  const sortKey = RECORDS_SORT[query.sort] ? query.sort : "newest";
  const skip = Number(query.skip) || 0;
  const limit = Math.min(Number(query.limit) || 40, 100);
  const [rows, total, yearRows] = await Promise.all([
    TOR.find(filter).sort(RECORDS_SORT[sortKey]).skip(skip).limit(limit).lean(),
    TOR.countDocuments(filter),
    TOR.distinct("budgetYear"),
  ]);
  return {
    total,
    skip,
    limit,
    items: rows.map(present),
    budgetYears: yearRows.filter(Boolean).sort((a, b) => String(b).localeCompare(String(a))),
  };
}

async function getTor(id) {
  const tor = await TOR.findById(id).lean();
  if (!tor) {
    const error = new Error("TOR not found.");
    error.statusCode = 404;
    throw error;
  }
  return { ...present(tor), summary: tor.summary, summaryTh: tor.summaryTh, titleEn: tor.title };
}

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

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');
}

function stripHtmlToText(html) {
  return decodeHtmlEntities(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatThaiMoment(chunk) {
  const match = String(chunk || "").match(
    /ที่\s*(\d{1,2})\s*([ก-๙]+)\s*(\d{4})\s*เวลา\s*(\d{1,2})[.:](\d{2})/,
  );
  if (!match) return String(chunk || "").trim();
  const [, day, monthTh, year, hour, minute] = match;
  const month = TH_MONTHS[monthTh] || monthTh;
  return `${day} ${month} ${year}, ${String(hour).padStart(2, "0")}:${minute}`;
}

function messageFromNonPdfBody(raw) {
  const text = stripHtmlToText(raw);
  const maintenance =
    /ปิดระบบ|maintenance|ชั่วคราว/i.test(text) ||
    /แจ้งปิดระบบ\s*e\s*-?\s*GP/i.test(text);
  if (!maintenance) return "Upstream did not return a PDF.";

  const untilMatch = text.match(
    /-\s*(วัน[ก-๙]*ที่\s*\d{1,2}\s*[ก-๙]+\s*\d{4}\s*เวลา\s*\d{1,2}[.:]\d{2}\s*น\.)/,
  );
  const resumeMatch = text.match(
    /เปิดใช้งานอีกครั้ง\s*(?:ใน)?\s*(วัน[ก-๙]*ที่\s*\d{1,2}\s*[ก-๙]+\s*\d{4}\s*เวลา\s*\d{1,2}[.:]\d{2}\s*น\.)/,
  );

  if (untilMatch?.[1] && resumeMatch?.[1]) {
    return `e-GP temporary maintenance until ${formatThaiMoment(untilMatch[1])}. Resumes ${formatThaiMoment(resumeMatch[1])}.`;
  }
  if (resumeMatch?.[1]) {
    return `e-GP temporary maintenance. Resumes ${formatThaiMoment(resumeMatch[1])}.`;
  }
  if (untilMatch?.[1]) {
    return `e-GP temporary maintenance until ${formatThaiMoment(untilMatch[1])}.`;
  }
  return "e-GP is under temporary maintenance, so the PDF is unavailable.";
}

async function downloadPdfBytes(pdfUrl) {
  // Prefer curl: e-GP often rejects Node's fetch fingerprint, and Alpine
  // containers resolve DNS more reliably through curl's resolver path.
  const id = randomBytes(8).toString("hex");
  const bodyPath = join(tmpdir(), `torrent-review-pdf-${id}.pdf`);
  try {
    await execFileAsync(
      "curl",
      [
        "-sS",
        "-L",
        "--max-time",
        "40",
        "-A",
        PDF_USER_AGENT,
        "-H",
        "Accept: application/pdf,*/*",
        "-o",
        bodyPath,
        pdfUrl,
      ],
      { timeout: 45000 },
    );
    const bytes = await readFile(bodyPath);
    if (bytes.subarray(0, 5).toString() !== "%PDF-") {
      const body = bytes.toString("utf8", 0, Math.min(bytes.length, 8000));
      const error = new Error(messageFromNonPdfBody(body));
      error.statusCode = 502;
      throw error;
    }
    return bytes;
  } catch (error) {
    if (error.statusCode) throw error;
    if (error.code === "ENOENT") {
      // curl missing — fall back to fetch.
      const response = await fetch(pdfUrl, {
        headers: {
          Accept: "application/pdf,*/*",
          "User-Agent": PDF_USER_AGENT,
        },
      });
      if (!response.ok) {
        const failed = new Error(`Could not fetch PDF (${response.status}).`);
        failed.statusCode = 502;
        throw failed;
      }
      return Buffer.from(await response.arrayBuffer());
    }
    const failed = new Error(
      error.stderr?.toString?.().trim() || error.message || "Could not fetch PDF.",
    );
    failed.statusCode = 502;
    throw failed;
  } finally {
    await rm(bodyPath, { force: true });
  }
}

async function streamTorPdf(id) {
  const tor = await TOR.findById(id).lean();
  if (!tor) {
    const error = new Error("TOR not found.");
    error.statusCode = 404;
    throw error;
  }
  const pdfUrl = resolvePdfUrl(tor);
  if (!pdfUrl) {
    const error = new Error("No PDF attached to this TOR.");
    error.statusCode = 404;
    throw error;
  }
  const bytes = await downloadPdfBytes(pdfUrl);
  const nameFromUrl = String(pdfUrl).split("?")[0].split("/").pop() || "tor.pdf";
  const filename = /\.pdf$/i.test(nameFromUrl) ? nameFromUrl : "tor.pdf";
  return { bytes, contentType: "application/pdf", filename };
}

async function updateTor(id, user, body) {
  const reason = requireReason(body.reason);
  const current = await TOR.findById(id);
  if (!current) {
    const error = new Error("TOR not found.");
    error.statusCode = 404;
    throw error;
  }
  const before = current.toObject();
  const patch = {};
  for (const field of EDITABLE) {
    if (body[field] !== undefined) patch[field] = body[field];
  }
  if (patch.budgetThb !== undefined) patch.budgetThb = Number(patch.budgetThb) || 0;
  if (patch.deadline) patch.deadline = thaiDate(patch.deadline);
  if (patch.publishedAt) patch.publishedAt = thaiDate(patch.publishedAt);
  if (patch.hidden === true && !before.hiddenReason) patch.hiddenReason = "manual";
  if (patch.hidden === false) patch.hiddenReason = undefined;
  const updated = await TOR.findByIdAndUpdate(id, patch, { returnDocument: "after" });
  await record(user, {
    action: "tor.update",
    targetType: "tor",
    targetId: id,
    reason,
    changes: changesFor(before, updated.toObject(), EDITABLE),
  });
  return present(updated.toObject());
}

async function bulkTors(user, body) {
  const reason = requireReason(body.reason);
  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (!ids.length) {
    const error = new Error("Select at least one TOR.");
    error.statusCode = 400;
    throw error;
  }
  const action = body.action;
  const patch =
    action === "hide"
      ? { hidden: true, hiddenReason: "manual" }
      : action === "restore"
        ? { hidden: false, hiddenReason: null }
        : action === "review"
          ? { reviewStatus: "manual" }
          : null;
  if (!patch) {
    const error = new Error("Action must be hide, restore, or review.");
    error.statusCode = 400;
    throw error;
  }
  const result = await TOR.updateMany({ _id: { $in: ids } }, { $set: patch });
  await record(user, {
    action: `tor.bulk.${action}`,
    targetType: "tor",
    reason,
    changes: [{ field: "ids", before: null, after: ids }],
  });
  return { matched: result.matchedCount, modified: result.modifiedCount };
}

async function auditLog(query) {
  const filter = {};
  if (query.action) filter.action = query.action;
  if (query.targetType) filter.targetType = query.targetType;
  if (query.q) {
    filter.$or = [
      { actorEmail: new RegExp(query.q, "i") },
      { targetId: query.q },
      { reason: new RegExp(query.q, "i") },
    ];
  }
  const skip = Number(query.skip) || 0;
  const limit = Math.min(Number(query.limit) || 50, 200);
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  return { total, skip, limit, items };
}

function completeness(profile) {
  if (!profile) return 0;
  const checks = [
    profile.companyName,
    profile.companyEmail,
    profile.vendorCapDescription,
    profile.teamSize,
    profile.website,
    profile.location,
    profile.techSkills?.length,
    profile.pastProjects?.length,
    profile.certificates?.some((item) => item.status === "approved"),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

async function users() {
  const [people, profiles] = await Promise.all([
    User.find().select("-passwordHash").sort({ createdAt: -1 }).lean(),
    VendorProfile.find().lean(),
  ]);
  const byUser = new Map(profiles.map((profile) => [String(profile.userId), profile]));
  return {
    items: people.map((person) => {
      const profile = byUser.get(String(person._id));
      return {
        id: person._id,
        email: person.email,
        name: [person.firstname, person.lastname].filter(Boolean).join(" "),
        role: person.role,
        provider: person.provider,
        disabled: Boolean(person.disabled),
        emailVerified: Boolean(person.emailVerified),
        createdAt: person.createdAt,
        companyName: profile?.companyName || "",
        completeness: completeness(profile),
        certificates: profile?.certificates || [],
        profileId: profile?._id || null,
      };
    }),
  };
}

async function getUser(id) {
  const person = await User.findById(id).select("-passwordHash").lean();
  if (!person) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }
  const profile = await VendorProfile.findOne({ userId: person._id }).lean();
  return {
    id: person._id,
    email: person.email,
    name: [person.firstname, person.lastname].filter(Boolean).join(" "),
    firstname: person.firstname || "",
    lastname: person.lastname || "",
    role: person.role,
    provider: person.provider,
    picture: person.picture || "",
    disabled: Boolean(person.disabled),
    emailVerified: Boolean(person.emailVerified),
    createdAt: person.createdAt,
    completeness: completeness(profile),
    profileId: profile?._id || null,
    profile: profile
      ? {
          companyName: profile.companyName || "",
          companyEmail: profile.companyEmail || "",
          companyPhone: profile.companyPhone || "",
          website: profile.website || "",
          location: profile.location || "",
          teamSize: profile.teamSize || "",
          bio: profile.bio || "",
          vendorCapDescription: profile.vendorCapDescription || "",
          techSkills: profile.techSkills || [],
          pastProjects: profile.pastProjects || [],
          certificates: profile.certificates || [],
        }
      : null,
  };
}

async function updateUser(id, actor, body) {
  const reason = requireReason(body.reason);
  const current = await User.findById(id);
  if (!current) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }
  const patch = {};
  if (body.role && ["public", "vendor", "admin"].includes(body.role)) patch.role = body.role;
  if (typeof body.disabled === "boolean") patch.disabled = body.disabled;
  const before = { role: current.role, disabled: Boolean(current.disabled) };
  const updated = await User.findByIdAndUpdate(id, patch, { returnDocument: "after" });
  await record(actor, {
    action: "user.update",
    targetType: "user",
    targetId: id,
    reason,
    changes: changesFor(before, { role: updated.role, disabled: Boolean(updated.disabled) }, ["role", "disabled"]),
  });
  return { id: updated._id, role: updated.role, disabled: Boolean(updated.disabled) };
}

async function reviewCertificate(actor, body) {
  const reason = requireReason(body.reason);
  const profile = body.profileId
    ? await VendorProfile.findById(body.profileId)
    : await VendorProfile.findOne({ userId: body.userId });
  if (!profile) {
    const error = new Error("Vendor profile not found.");
    error.statusCode = 404;
    throw error;
  }
  if (!profile.certificates) profile.certificates = [];
  if (body.name && body.index === undefined) {
    profile.certificates.push({
      name: String(body.name).trim(),
      issuer: body.issuer || "",
      status: body.status || "pending",
      note: reason,
    });
  } else {
    const certificate = profile.certificates[Number(body.index)];
    if (!certificate) {
      const error = new Error("Certificate not found.");
      error.statusCode = 404;
      throw error;
    }
    const before = {
      name: certificate.name || "",
      issuer: certificate.issuer || "",
      status: certificate.status || "pending",
    };
    if (body.name !== undefined) certificate.name = String(body.name).trim();
    if (body.issuer !== undefined) certificate.issuer = String(body.issuer || "").trim();
    if (body.status) certificate.status = body.status;
    if (body.note !== undefined) certificate.note = String(body.note || "").trim();
    else certificate.note = reason;
    const after = {
      name: certificate.name || "",
      issuer: certificate.issuer || "",
      status: certificate.status || "pending",
    };
    await record(actor, {
      action: "certificate.review",
      targetType: "vendor",
      targetId: profile.userId,
      reason,
      changes: changesFor(before, after, ["name", "issuer", "status"]),
    });
  }
  await profile.save();
  if (body.name && body.index === undefined) {
    await record(actor, {
      action: "certificate.review",
      targetType: "vendor",
      targetId: profile.userId,
      reason,
      changes: [{ field: body.name, before: null, after: body.status || "pending" }],
    });
  }
  return { certificates: profile.certificates, completeness: completeness(profile) };
}

async function matchJobs() {
  const grouped = await TorMatchJob.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(grouped.map((row) => [row._id, row.count]));
  const failed = await TorMatchJob.find({ lastError: { $nin: [null, ""] } })
    .sort({ updatedAt: -1 })
    .limit(40)
    .lean();
  return {
    counts: {
      pending: counts.pending || 0,
      running: counts.running || 0,
      waiting: counts.waiting || 0,
      complete: counts.complete || 0,
    },
    failed,
  };
}

async function retryMatches(actor, body) {
  const reason = requireReason(body.reason);
  const filter = body.id ? { _id: body.id } : { lastError: { $nin: [null, ""] } };
  const result = await TorMatchJob.updateMany(filter, {
    $set: { status: "pending", lastError: "", retryAt: new Date() },
  });
  await record(actor, {
    action: "match.retry",
    targetType: "match-job",
    targetId: body.id,
    reason,
    changes: [{ field: "retried", before: null, after: result.modifiedCount }],
  });
  return { modified: result.modifiedCount };
}

async function settings() {
  return classification.readSettings();
}

async function previewRules(body) {
  const current = await classification.readSettings();
  const next = {
    includeKeywords: classification.cleanList(body.includeKeywords, current.includeKeywords),
    excludeKeywords: classification.cleanList(body.excludeKeywords, current.excludeKeywords),
  };
  const titles = await TOR.find({ source: "DATA-GO-EGP" }).select("title").lean();
  return classification.compareTitles(titles.map((row) => row.title), current, next);
}

async function applyRules(actor, body) {
  const reason = requireReason(body.reason);
  const current = await classification.readSettings();
  const includeKeywords = classification.cleanList(body.includeKeywords, current.includeKeywords);
  const excludeKeywords = classification.cleanList(body.excludeKeywords, current.excludeKeywords);
  const autoThreshold = Number(body.autoThreshold) || current.autoThreshold;
  const reviewThreshold = Number(body.reviewThreshold) || current.reviewThreshold;
  await AdminSettings.findOneAndUpdate(
    { key: "ops" },
    { key: "ops", includeKeywords, excludeKeywords, autoThreshold, reviewThreshold },
    { upsert: true, returnDocument: "after" },
  );
  const rules = { includeKeywords, excludeKeywords };
  const rows = await TOR.find({ source: "DATA-GO-EGP" }).select("title hidden hiddenReason category").lean();
  let hidden = 0;
  let restored = 0;
  let ops = [];
  for (const row of rows) {
    const matched = matchingSoftwareTerms(row.title, rules).length > 0;
    if (!matched && !row.hidden) {
      hidden += 1;
      ops.push({
        updateOne: {
          filter: { _id: row._id },
          update: { $set: { hidden: true, hiddenReason: "rule", reviewStatus: "manual" } },
        },
      });
    } else if (matched && row.hiddenReason === "rule") {
      restored += 1;
      ops.push({
        updateOne: {
          filter: { _id: row._id },
          update: {
            $set: { hidden: false, category: classifyCategory(row.title) },
            $unset: { hiddenReason: "" },
          },
        },
      });
    }
    if (ops.length >= 500) {
      await TOR.bulkWrite(ops);
      ops = [];
    }
  }
  if (ops.length) await TOR.bulkWrite(ops);
  await record(actor, {
    action: "rules.apply",
    targetType: "classification",
    reason,
    changes: [
      { field: "hiddenByRule", before: null, after: hidden },
      { field: "restored", before: null, after: restored },
      { field: "autoThreshold", before: current.autoThreshold, after: autoThreshold },
      { field: "reviewThreshold", before: current.reviewThreshold, after: reviewThreshold },
    ],
  });
  return { hidden, restored, autoThreshold, reviewThreshold };
}

module.exports = {
  SOURCES,
  applyRules,
  auditLog,
  bulkTors,
  getTor,
  streamTorPdf,
  matchJobs,
  overview,
  previewRules,
  rescore,
  retryMatches,
  reviewCertificate,
  reviewQueue,
  reviewTor,
  searchTors,
  settings,
  sources,
  updateTor,
  getUser,
  updateUser,
  users,
};
