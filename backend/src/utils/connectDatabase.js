const mongoose = require("mongoose");
const User = require("@/models/User");
const VendorProfile = require("@/models/VendorProfile");
const UserBio = require("@/models/UserBio");
const TOR = require("@/models/TOR");
const TORMatch = require("@/models/TORMatch");
const TorMatchJob = require("@/models/TorMatchJob");

async function connectDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is required. Add your MongoDB URI to backend/.env.");
  }

  await mongoose.connect(uri, { dbName: "Torrent" });
  await Promise.all([
    User.init(),
    VendorProfile.init(),
    UserBio.init(),
    TOR.init(),
    TORMatch.init(),
    TorMatchJob.init(),
  ]);
  console.log("Connected to MongoDB");
}

module.exports = { connectDatabase };
