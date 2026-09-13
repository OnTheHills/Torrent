require("dotenv").config();

import { listen } from "./app";
import { connectDatabase } from "./utils/connectDatabase";
import { startSyncScheduler } from "./scheduler/syncScheduler";
const PORT = process.env.PORT;

async function startServer() {
  try {
    await connectDatabase();

    // Serve database reads while the optional startup sync runs. An external
    // source can be slow even after another source has already saved its TORs.
    listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Sync can save data only after the database and indexes are ready.
    await startSyncScheduler();
  } catch (error) {
    console.error("Backend startup failed:", error);
    process.exit(1);
  }
}

startServer();
