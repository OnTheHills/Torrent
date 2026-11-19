require("module-alias/register");
if (process.env.SECRETS_ONLY !== "true") require("dotenv").config();

const mongoose = require("mongoose");

const { connectDatabase } = require("@/utils/connectDatabase");
const userRepository = require("@/repositories/user/userRepository");
const { record } = require("@/services/admin/audit");

// Usage: node scripts/promote-admin.js <email>
// The account must already exist, so the person signs in with Google first.
async function main() {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Usage: node scripts/promote-admin.js <email>");
    process.exit(1);
  }

  // The host backend .env points at the Docker hostname. This script may run on the host.
  if (process.env.SECRETS_ONLY !== "true" && !process.env.MONGO_URI_FILE) {
    process.env.MONGO_URI = process.env.MONGO_URI_HOST || "mongodb://127.0.0.1:27017/Torrent";
  }
  await connectDatabase();

  const user = await userRepository.findByEmail(email);
  if (!user) {
    console.error(`No account for ${email}. Sign in with Google once, then run this again.`);
    process.exit(1);
  }

  const before = { role: user.role, disabled: Boolean(user.disabled) };
  if (before.role === "admin" && !before.disabled) {
    console.log(`${email} is already an admin.`);
    process.exit(0);
  }

  user.role = "admin";
  user.disabled = false;
  await userRepository.save(user);

  const changes = [];
  if (before.role !== "admin") changes.push({ field: "role", before: before.role, after: "admin" });
  if (before.disabled) changes.push({ field: "disabled", before: true, after: false });
  await record(null, {
    action: "user.update",
    targetType: "user",
    targetId: user._id,
    reason: "Promoted to admin from the server command line",
    changes,
  });

  console.log(`${email} is now an admin.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
