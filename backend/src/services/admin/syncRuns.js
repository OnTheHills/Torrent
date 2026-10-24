const SyncRun = require("@/models/SyncRun");
const { record } = require("@/services/admin/audit");

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

async function start(sourceKey, user, trigger = "manual") {
  const run = await SyncRun.create({
    sourceKey,
    trigger,
    status: "running",
    startedAt: new Date(),
    triggeredBy: user?.sub,
    triggeredByEmail: user?.email,
  });
  if (user) {
    await record(user, {
      action: "sync.start",
      targetType: "source",
      targetId: sourceKey,
      reason: "Manual sync",
    }).catch(() => {});
  }
  return run;
}

async function finish(run, { status, summary, error }) {
  const finishedAt = new Date();
  return SyncRun.findByIdAndUpdate(
    run._id,
    {
      status,
      finishedAt,
      durationMs: finishedAt - new Date(run.startedAt),
      error,
      summary,
      ...counts(summary),
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

module.exports = { closeInterrupted, finish, start };
