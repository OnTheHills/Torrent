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
      const result = await syncAPI();
      if (run) await syncRuns.finish(run, { status: "success", summary: result }).catch(() => {});
      console.log(`${label} sync job completed successfully:`, result);
    } catch (error) {
      if (run) await syncRuns.finish(run, { status: "failed", error: error.message }).catch(() => {});
      console.error(`${label} sync job failed:`, error);
    }
  }

  await syncRuns.closeInterrupted().catch((error) => {
    console.error("Closing interrupted sync runs failed:", error);
  });

  // Finish the optional initial fetch before the server begins serving pages.
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
