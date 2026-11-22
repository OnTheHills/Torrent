const cron = require("node-cron");
const { syncAPI } = require("@/jobs/syncAPI");
const syncRuns = require("@/services/admin/syncRuns");
const { errorFields, logger, safeErrorSummary } = require("@/utils/logger");

// Schedule the TOR synchronization workflow without exposing cron concerns to controllers.

async function startSyncScheduler() {
  async function runSync(label, trigger) {
    logger.info("sync.run.started", { source: "all", trigger });
    const run = await syncRuns.start("all", null, trigger).catch((error) => {
      logger.error("sync.run.record_start_failed", { source: "all", ...errorFields(error) });
      return null;
    });
    try {
      const result = await syncAPI({ automatic: true });
      const failures = result.filter((row) => row.status === "failed");
      const status = failures.length ? "failed" : "success";
      const error = failures.length
        ? failures.map((row) => `${row.sourceKey}: ${row.error}`).join(" | ")
        : undefined;
      if (run) await syncRuns.finish(run, { status, summary: result, error }).catch(() => {});
      logger.info("sync.run.completed", {
        source: "all",
        trigger,
        status,
        sources: result.map(({ sourceKey, status: sourceStatus, fetched, created, updated }) => ({
          source: sourceKey,
          status: sourceStatus,
          fetched,
          created,
          updated,
        })),
      });
    } catch (error) {
      if (run) await syncRuns.finish(run, { status: "failed", error: safeErrorSummary(error) }).catch(() => {});
      logger.error("sync.run.failed", { source: "all", trigger, ...errorFields(error) });
    }
  }

  await syncRuns.closeInterrupted().catch((error) => {
    logger.error("sync.run.close_interrupted_failed", errorFields(error));
  });

  // Startup uses the same all-source ingestion as the nightly job.
  if (process.env.FETCH_ON_STARTUP?.trim().toLowerCase() === "true") {
    await runSync("Startup", "startup");
  }

  cron.schedule("0 0 * * *", () => runSync("Scheduled", "auto"), {
    timezone: "Asia/Bangkok",
    noOverlap: true,
  });

  logger.info("sync.schedule.registered", { schedule: "0 0 * * *", timeZone: "Asia/Bangkok" });
}

module.exports = { startSyncScheduler };
