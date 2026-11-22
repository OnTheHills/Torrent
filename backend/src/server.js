if (process.env.SECRETS_ONLY !== "true") require("dotenv").config();
require("module-alias/register");
require("@/config/secrets").validateSecrets();

const app = require("@/app");
const { connectDatabase } = require("@/utils/connectDatabase");
const { startSyncScheduler } = require("@/scheduler/syncScheduler");
const { startMatchScheduler } = require("@/scheduler/matchScheduler");
const { startLineDigestScheduler } = require("@/scheduler/lineDigestScheduler");
const { startEmailAlertScheduler } = require("@/scheduler/emailAlertScheduler");
const { errorFields, logger } = require("@/utils/logger");
const PORT = process.env.PORT;

async function startServer() {
  try {
    await connectDatabase();

    // Serve database reads while the optional startup sync runs. An external
    // source can be slow even after another source has already saved its TORs.
    app.listen(PORT, () => {
      logger.info("server.listening", { port: Number(PORT) || PORT });
    });

    // Resume saved matching work as soon as MongoDB is ready.
    await startMatchScheduler();
    // Sync can save data only after the database and indexes are ready.
    await startSyncScheduler();
    // Start LINE digest scheduler
    await startLineDigestScheduler();
    startEmailAlertScheduler();
  } catch (error) {
    logger.error("server.startup_failed", errorFields(error));
    process.exit(1);
  }
}

startServer();
