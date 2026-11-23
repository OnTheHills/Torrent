require("module-alias/register");
if (process.env.SECRETS_ONLY !== "true") require("dotenv").config();

const { connectDatabase } = require("@/utils/connectDatabase");
const { reconcileAll } = require("@/services/tor/mergeDuplicateTors");

async function main() {
  await connectDatabase();
  const summary = await reconcileAll();
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
