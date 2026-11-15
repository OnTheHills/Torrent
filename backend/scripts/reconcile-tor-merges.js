require("module-alias/register");
if (process.env.SECRETS_ONLY !== "true") require("dotenv").config();

const { connectDatabase } = require("@/utils/connectDatabase");
const { reconcileAll } = require("@/services/tor/mergeDuplicateTors");

async function main() {
  // The host backend .env points at the Docker hostname. This script runs on the host.
  if (process.env.SECRETS_ONLY !== "true" && !process.env.MONGO_URI_FILE) {
    process.env.MONGO_URI = process.env.MONGO_URI_HOST || "mongodb://127.0.0.1:27017/Torrent";
  }
  await connectDatabase();
  const summary = await reconcileAll();
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
