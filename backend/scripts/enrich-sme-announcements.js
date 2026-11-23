require("module-alias/register");
if (process.env.SECRETS_ONLY !== "true") require("dotenv").config();

const { connectDatabase } = require("@/utils/connectDatabase");
const { enrichStored } = require("@/services/tor/smeAnnouncement");

async function main() {
  await connectDatabase();
  const summary = await enrichStored();
  console.log(JSON.stringify(summary));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
