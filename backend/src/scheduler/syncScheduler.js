const cron = require("node-cron");
const { syncAPI } = require("../jobs/syncAPI");

// Schedule the TOR synchronization workflow without exposing cron concerns to controllers.

async function startSyncScheduler() {
  async function runSync(trigger) {
    console.log(`Running ${trigger} BMA/SME-GP sync job...`);
    try {
      const result = await syncAPI();
      console.log(`${trigger} sync job completed successfully:`, result);
    } catch (error) {
      console.error(`${trigger} sync job failed:`, error);
    }
  }

  // Finish the optional initial fetch before the server begins serving pages.
  if (process.env.FETCH_ON_STARTUP?.trim().toLowerCase() === "true") {
    await runSync("Startup");
  }

  cron.schedule("0 0 * * *", () => runSync("Scheduled"), {
    timezone: "Asia/Bangkok",
    noOverlap: true,
  });

  console.log("BMA/SME-GP sync scheduled for 00:00 Asia/Bangkok daily.");
}

module.exports = { startSyncScheduler };
