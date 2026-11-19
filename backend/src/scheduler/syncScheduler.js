const cron = require("node-cron");
const { syncAPI } = require("@/jobs/syncAPI");
const syncRuns = require("@/services/admin/syncRuns");

// Schedule the TOR synchronization workflow without exposing cron concerns to controllers.

async function startSyncScheduler() {
  async function runSync(label, trigger) {
    console.log(`Running ${label} procurement sync job...`);
    const run = await syncRuns.start("all", null, trigger).catch((error) => {
      console.error(`${label} sync run record failed:`, error);
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
      console.log(`${label} sync job completed (${status}):`, result);
    } catch (error) {
      if (run) await syncRuns.finish(run, { status: "failed", error: error.message }).catch(() => {});
      console.error(`${label} sync job failed:`, error);
    }
  }

  await syncRuns.closeInterrupted().catch((error) => {
    console.error("Closing interrupted sync runs failed:", error);
  });

  // Startup uses the same all-source ingestion as the nightly job.
  if (process.env.FETCH_ON_STARTUP?.trim().toLowerCase() === "true") {
    await runSync("Startup", "startup");
  }

  cron.schedule("0 0 * * *", () => runSync("Scheduled", "auto"), {
    timezone: "Asia/Bangkok",
    noOverlap: true,
  });

  console.log("Procurement sync scheduled for 00:00 Asia/Bangkok daily.");
}

module.exports = { startSyncScheduler };
