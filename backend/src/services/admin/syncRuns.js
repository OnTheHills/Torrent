const SyncRun = require("@/models/sync/SyncRun");
const { record } = require("@/services/admin/audit");
const { safeErrorSummary } = require("@/utils/logger");

const SUMMARY_COUNTERS = [
  "fetched", "matched", "created", "updated", "unchanged", "removed",
  "mergeGroups", "mergeMerged", "mergeConflicted",
  "ocrAttempted", "ocrUpdated", "ocrSkipped", "ocrFailed",
  "stageChecked", "stageUnchanged", "stageAwarded", "stageCancelled", "stageOpen",
  "announcementRead", "announcementUpdated", "announcementSkipped", "announcementFailed",
  "reviewScored", "reviewVertexScored",
];

function total(rows, field) {
  const values = rows.map((row) => row?.[field]).filter((value) => typeof value === "number");
  return values.length ? values.reduce((sum, value) => sum + value, 0) : undefined;
}

function counts(summary) {
  const rows = Array.isArray(summary) ? summary : [summary || {}];
  return {
    fetched: total(rows, "fetched"),
    matched: total(rows, "matched"),
    createdCount: total(rows, "created"),
    updatedCount: total(rows, "updated"),
    unchangedCount: total(rows, "unchanged"),
    removedCount: total(rows, "removed"),
  };
}

function safeSummary(summary) {
  const sanitize = (row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return {};
    const safe = {};
    for (const field of ["source", "sourceKey"]) {
      if (typeof row[field] === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(row[field])) safe[field] = row[field];
    }
    if (["success", "failed"].includes(row.status)) safe.status = row.status;
    for (const field of SUMMARY_COUNTERS) {
      if (Number.isFinite(row[field])) safe[field] = row[field];
    }
    if (row.error !== undefined) safe.error = safeErrorSummary(row.error);
    return safe;
  };
  return Array.isArray(summary) ? summary.map(sanitize) : sanitize(summary);
}

async function start(sourceKey, user, trigger = "manual", requestId) {
  const run = await SyncRun.create({
    sourceKey,
    trigger,
    status: "running",
    startedAt: new Date(),
    triggeredBy: user?.sub,
    triggeredByEmail: user?.email,
    requestId,
  });
  if (user) {
    await record(user, {
      action: "sync.start",
      targetType: "source",
      targetId: sourceKey,
      reason: "Manual sync",
    }, requestId).catch(() => {});
  }
  return run;
}

async function finish(run, { status, summary, error }) {
  const finishedAt = new Date();
  const storedSummary = summary === undefined ? undefined : safeSummary(summary);
  return SyncRun.findByIdAndUpdate(
    run._id,
    {
      status,
      finishedAt,
      durationMs: finishedAt - new Date(run.startedAt),
      error: safeErrorSummary(error),
      summary: storedSummary,
      ...counts(storedSummary),
    },
    { returnDocument: "after" },
  );
}

// A restart kills any sync in flight, so a run still marked running at boot never finished.
async function closeInterrupted() {
  const finishedAt = new Date();
  const result = await SyncRun.updateMany(
    { status: "running" },
    { status: "failed", finishedAt, error: "Interrupted by a server restart" },
  );
  return result.modifiedCount || 0;
}

module.exports = { closeInterrupted, finish, start, safeSummary };
