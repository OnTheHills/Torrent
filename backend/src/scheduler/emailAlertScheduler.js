const cron = require("node-cron");
const { runEmailAlerts } = require("@/services/email/alertDeliveryService");
const { EMAIL_ALERT_CRON, EMAIL_ALERT_TIME_ZONE } = require("@/constants/emailAlertConstants");

function startEmailAlertScheduler() {
  const run = async () => {
    try {
      const result = await runEmailAlerts();
      if (result.notificationsCreated || result.queued || result.sent) console.log("Alerts", result);
    } catch (error) {
      console.error("Alert job failed:", error);
    }
  };
  void run();
  cron.schedule(EMAIL_ALERT_CRON, run, { timezone: EMAIL_ALERT_TIME_ZONE, noOverlap: true });
}

module.exports = { startEmailAlertScheduler };
