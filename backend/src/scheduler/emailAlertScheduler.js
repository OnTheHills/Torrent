const cron = require("node-cron");
const { runEmailAlerts } = require("@/services/email/alertDeliveryService");
const { EMAIL_ALERT_CRON, EMAIL_ALERT_TIME_ZONE } = require("@/constants/emailAlertConstants");
const { errorFields, logger } = require("@/utils/logger");

function startEmailAlertScheduler() {
  const run = async () => {
    try {
      const result = await runEmailAlerts();
      if (result.notificationsCreated || result.queued || result.sent) {
        logger.info("email_alert.run.completed", {
          notificationsCreated: result.notificationsCreated,
          queued: result.queued,
          sent: result.sent,
        });
      }
    } catch (error) {
      logger.error("email_alert.run.failed", errorFields(error));
    }
  };
  void run();
  cron.schedule(EMAIL_ALERT_CRON, run, { timezone: EMAIL_ALERT_TIME_ZONE, noOverlap: true });
}

module.exports = { startEmailAlertScheduler };
