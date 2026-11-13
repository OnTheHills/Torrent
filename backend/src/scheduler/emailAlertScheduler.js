const cron = require("node-cron");
const { runEmailAlerts } = require("@/services/email/alertDeliveryService");
const { EMAIL_ALERT_CRON, EMAIL_ALERT_TIME_ZONE } = require("@/constants/emailAlertConstants");

function startEmailAlertScheduler() {
  cron.schedule(EMAIL_ALERT_CRON, async () => {
    try {
      const result = await runEmailAlerts();
      if (!result.skipped && (result.queued || result.sent)) console.log("Email alerts", result);
    } catch (error) {
      console.error("Email alert job failed:", error);
    }
  }, { timezone: EMAIL_ALERT_TIME_ZONE, noOverlap: true });
}

module.exports = { startEmailAlertScheduler };
