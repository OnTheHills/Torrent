const cron = require("node-cron");
const { runLineWeeklyDigest } = require("@/jobs/lineWeeklyDigest");

async function startLineDigestScheduler() {
  // Every Monday 09:00 Asia/Bangkok
  cron.schedule(
    "0 9 * * 1",
    async () => {
      console.log("Running LINE weekly digest...");
      try {
        const result = await runLineWeeklyDigest();
        console.log("LINE weekly digest done:", result);
      } catch (error) {
        console.error("LINE weekly digest failed:", error);
      }
    },
    { timezone: "Asia/Bangkok", noOverlap: true },
  );

  console.log("LINE weekly digest scheduled for Mon 09:00 Asia/Bangkok");
}

module.exports = { startLineDigestScheduler };