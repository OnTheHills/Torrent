require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./utils/connectDatabase");
const { startSyncScheduler } = require("./services/syncScheduler");

const PORT = process.env.PORT || 5175;

async function startServer() {
  try {
    await connectDatabase();

    // Sync can save data only after the database and indexes are ready.
    await startSyncScheduler();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error);
    process.exit(1);
  }
}

startServer();
