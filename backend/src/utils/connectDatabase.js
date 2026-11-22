const mongoose = require("mongoose");
const { logger } = require("@/utils/logger");
const { readSecret } = require("@/config/secrets");
const User = require("@/models/user/User");
const VendorProfile = require("@/models/vendor/VendorProfile");
const TOR = require("@/models/tor/TOR");
const TORMatch = require("@/models/tor/TORMatch");
const TorMatchJob = require("@/models/tor/TorMatchJob");
const EmailAlert = require("@/models/email/EmailAlert");
const Notification = require("@/models/Notification");
const { migrateVendorProfileFields } = require("./migrateVendorProfileFields");

async function connectDatabase() {
  const uri = readSecret("MONGO_URI", { required: true });

  await mongoose.connect(uri, { dbName: "Torrent" });
  await Promise.all([
    User.init(),
    VendorProfile.init(),
    TOR.init(),
    TORMatch.init(),
    TorMatchJob.init(),
    EmailAlert.init(),
    Notification.init(),
  ]);
  await migrateVendorProfileFields();
  logger.info("database.connected", { database: "mongodb" });
}

module.exports = { connectDatabase };
