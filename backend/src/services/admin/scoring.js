const DAY = 24 * 60 * 60 * 1000;
const OPEN_STATUSES = new Set(["open", "published", "draft", "closing"]);
const CLOSED_STATUSES = new Set(["awarded", "cancelled", "closed", "winner"]);
const RECENT_WITHOUT_DEADLINE_MS = 90 * DAY;

function bangkokStartOfToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
  return new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00+07:00`);
}

/** Closing soon = deadline within the next 7 Bangkok calendar days (inclusive). */
function closingWindow(now = new Date()) {
  const today = bangkokStartOfToday(now);
  return { today, until: new Date(today.getTime() + 7 * DAY) };
}

function stageClauses(stages = [], now = new Date()) {
  const wanted = stages.filter((stage) => stage === "closing" || stage === "open" || stage === "draft");
  if (!wanted.length) return null;
  const { today, until } = closingWindow(now);
  const clauses = [];
  if (wanted.includes("closing")) {
    clauses.push({ deadline: { $gte: today, $lte: until } });
  }
  if (wanted.includes("open")) {
    clauses.push(
      { deadline: { $gt: until } },
      {
        $and: [
          { $or: [{ deadline: null }, { deadline: { $exists: false } }] },
          { status: { $nin: ["draft", "Draft"] } },
        ],
      },
    );
  }
  if (wanted.includes("draft")) {
    clauses.push({ status: { $in: ["draft", "Draft"] } });
  }
  return { $or: clauses };
}

function confidenceOf(tor) {
  let confidence = 100;
  const missing = [];
  if (!tor.budgetThb) {
    confidence -= 25;
    missing.push("budget");
  }
  if (!tor.deadline) {
    confidence -= 15;
    missing.push("deadline");
  }
  if (!tor.category || tor.category === "Others" || tor.category === "Uncategorized") {
    confidence -= 10;
    missing.push("category");
  }
  if (!tor.department && !tor.departmentTh) {
    confidence -= 10;
    missing.push("department");
  }
  if (!tor.publishedAt) {
    confidence -= 10;
    missing.push("publishedAt");
  }
  const ocr = tor.ocr?.status;
  if (ocr === "failed" || ocr === "error") {
    confidence -= 20;
    missing.push("ocr");
  } else if (ocr === "no_file") {
    confidence -= 8;
  }
  if (tor.title && String(tor.title).trim().length < 12) {
    confidence -= 10;
    missing.push("title");
  }
  return { confidence: Math.max(0, Math.min(100, confidence)), missing };
}

function reviewBand(confidence, autoThreshold = 90, reviewThreshold = 80) {
  if (confidence >= autoThreshold) return "auto";
  if (confidence >= reviewThreshold) return "review";
  return "manual";
}

/** Open/upcoming only — historical expired rows stay out of the human queue. */
function isReviewEligible(tor, now = new Date()) {
  const status = String(tor.status || "").trim().toLowerCase();
  if (CLOSED_STATUSES.has(status)) return false;

  const today = bangkokStartOfToday(now);
  if (tor.deadline) {
    const deadline = new Date(tor.deadline);
    if (!Number.isNaN(deadline.getTime())) return deadline.getTime() >= today.getTime();
  }

  if (status && !OPEN_STATUSES.has(status)) return false;
  if (!tor.publishedAt) return false;
  const published = new Date(tor.publishedAt);
  if (Number.isNaN(published.getTime())) return false;
  return now.getTime() - published.getTime() <= RECENT_WITHOUT_DEADLINE_MS;
}

function eligibilityFilter(now = new Date()) {
  const today = bangkokStartOfToday(now);
  const recentSince = new Date(now.getTime() - RECENT_WITHOUT_DEADLINE_MS);
  return {
    status: { $nin: [...CLOSED_STATUSES] },
    $or: [
      { deadline: { $gte: today } },
      {
        $and: [
          { $or: [{ deadline: null }, { deadline: { $exists: false } }] },
          {
            $or: [
              { status: { $in: [...OPEN_STATUSES] } },
              { status: null },
              { status: { $exists: false } },
              { status: "" },
            ],
          },
          { publishedAt: { $gte: recentSince } },
        ],
      },
    ],
  };
}

function sourceVerdict(run, now = Date.now()) {
  if (!run) return "yellow";
  if (run.status === "failed") return "red";
  if (run.status === "running") return "yellow";
  const finished = new Date(run.finishedAt || run.startedAt || 0).getTime();
  if (!finished || now - finished > DAY) return "yellow";
  if (run.sourceKey !== "smeAnnouncements" && run.fetched === 0) return "red";
  return "green";
}

const INTEGRITY_FLAG_LABELS = {
  "short-window": "Bidding window under 3 days",
  "deadline-before-publish": "Deadline is before the announcement",
  "awarded-without-budget": "Awarded with no budget",
  "budget-high": "Budget is more than 3× the category median",
  "budget-low": "Budget is under a quarter of the category median",
};

/** Deterministic procurement anomaly flags (Watch out). Always recomputed on score. */
function integrityReasons(tor, median) {
  const reasons = [];
  if (tor.publishedAt && tor.deadline) {
    const days = (new Date(tor.deadline) - new Date(tor.publishedAt)) / DAY;
    if (days < 0) reasons.push("deadline-before-publish");
    else if (days < 3 && (tor.status === "published" || !tor.status)) reasons.push("short-window");
  }
  if (tor.status === "awarded" && !tor.budgetThb) reasons.push("awarded-without-budget");
  if (median && median.count >= 5 && tor.budgetThb) {
    if (tor.budgetThb > median.median * 3) reasons.push("budget-high");
    if (tor.budgetThb < median.median * 0.25) reasons.push("budget-low");
  }
  return reasons;
}

function integrityLabel(flag) {
  return INTEGRITY_FLAG_LABELS[flag] || flag;
}

/**
 * Merge rule flags with optional Vertex judgment into TOR integrity fields.
 * Watch out when any rule fires or Vertex returns integrity "watch".
 */
function resolveIntegrityFields(heuristicFlags = [], vertex = null) {
  const vertexFlags = Array.isArray(vertex?.integrityFlags)
    ? vertex.integrityFlags.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const flags = [...new Set([...heuristicFlags, ...vertexFlags])].slice(0, 12);
  const watch = flags.length > 0 || vertex?.integrity === "watch";
  const note =
    (vertex?.ok && String(vertex.integrityReason || "").trim()) ||
    (flags.length ? flags.map(integrityLabel).join(" · ") : "");
  return {
    integrityStatus: watch ? "flagged" : "clear",
    integrityFlags: flags,
    integrityReason: flags[0] || (watch ? "other" : ""),
    integrityNote: String(note || "").slice(0, 500),
  };
}

function accuracyFromReviews(logs) {
  let checked = 0;
  let corrections = 0;
  const byField = {};
  for (const log of logs) {
    const fields = Array.isArray(log.checked) ? log.checked : [];
    const changed = new Set((log.changes || []).map((change) => change.field));
    for (const field of fields) {
      checked += 1;
      byField[field] = byField[field] || { checked: 0, corrections: 0 };
      byField[field].checked += 1;
      if (changed.has(field)) {
        corrections += 1;
        byField[field].corrections += 1;
      }
    }
  }
  return {
    sampleSize: logs.length,
    checked,
    corrections,
    accuracy: checked ? Math.round(((checked - corrections) / checked) * 1000) / 10 : null,
    byField: Object.entries(byField).map(([field, stats]) => ({
      field,
      ...stats,
      accuracy: Math.round(((stats.checked - stats.corrections) / stats.checked) * 1000) / 10,
    })),
  };
}

function runTime(run) {
  return new Date(run.finishedAt || run.startedAt || 0).getTime();
}

// A full sync covers every feed, so its per-source summary row counts as that feed's latest run.
function latestRunsBySource(runs, sources) {
  const latest = new Map();
  for (const run of runs) {
    if (run.sourceKey === "all") {
      const rows = Array.isArray(run.summary) ? run.summary : [];
      for (const source of sources) {
        const row = rows.find((item) => item?.source === source.source);
        if (run.status === "success" && !row) continue;
        const derived = {
          ...run,
          sourceKey: source.key,
          fetched: row?.fetched,
          matched: row?.matched,
          createdCount: row?.created,
        };
        const current = latest.get(source.key);
        if (!current || runTime(derived) > runTime(current)) latest.set(source.key, derived);
      }
      continue;
    }
    const current = latest.get(run.sourceKey);
    if (!current || runTime(run) > runTime(current)) latest.set(run.sourceKey, run);
  }
  return latest;
}

module.exports = {
  accuracyFromReviews,
  bangkokStartOfToday,
  closingWindow,
  confidenceOf,
  eligibilityFilter,
  INTEGRITY_FLAG_LABELS,
  integrityLabel,
  integrityReasons,
  isReviewEligible,
  latestRunsBySource,
  resolveIntegrityFields,
  reviewBand,
  sourceVerdict,
  stageClauses,
};
