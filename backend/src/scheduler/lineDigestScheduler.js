const cron = require("node-cron");
const { runLineWeeklyDigest } = require("@/services/line/lineDigestService");
const { errorFields, logger } = require("@/utils/logger");

async function startLineDigestScheduler() {
  // Every Monday 09:00 Asia/Bangkok
  cron.schedule(
    "0 9 * * 1",
    async () => {
      logger.info("line_digest.run.started");
      try {
        const result = await runLineWeeklyDigest();
        logger.info("line_digest.run.completed", {
          sent: result.sent,
          tors: result.tors,
          recipients: result.recipients,
          skipped: result.skipped,
          quotaExhausted: result.quotaExhausted,
        });
      } catch (error) {
        logger.error("line_digest.run.failed", errorFields(error));
      }
    },
    { timezone: "Asia/Bangkok", noOverlap: true },
  );

  logger.info("line_digest.schedule.registered", { schedule: "0 9 * * 1", timeZone: "Asia/Bangkok" });
}

module.exports = { startLineDigestScheduler };
