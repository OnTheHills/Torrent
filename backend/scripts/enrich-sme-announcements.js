require("module-alias/register");
if (process.env.SECRETS_ONLY !== "true") require("dotenv").config();

const { connectDatabase } = require("@/utils/connectDatabase");
const { enrichStored } = require("@/services/tor/smeAnnouncement");

async function main() {
  // The host backend .env points at the Docker hostname. This script runs on the host.
  if (process.env.SECRETS_ONLY !== "true" && !process.env.MONGO_URI_FILE) {
    process.env.MONGO_URI = process.env.MONGO_URI_HOST || "mongodb://127.0.0.1:27017/Torrent";
  }
  await connectDatabase();
  const summary = await enrichStored();
  console.log(JSON.stringify(summary));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
