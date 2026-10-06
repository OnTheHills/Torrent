require("module-alias/register");
require("dotenv").config();

const { connectDatabase } = require("@/utils/connectDatabase");
const { enrichStored } = require("@/services/tor/api/smeGp/announcement");

async function main() {
  // The host backend .env points at the Docker hostname. This script runs on the host.
  process.env.MONGO_URI = "mongodb://127.0.0.1:27017/Torrent";
  await connectDatabase();
  const summary = await enrichStored();
  console.log(JSON.stringify(summary));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
