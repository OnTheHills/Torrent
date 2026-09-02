require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
const smegpSyncService = require("./services/smegpSyncService");
const User = require("./models/User");
const VendorProfile = require("./models/VendorProfile");
const UserBio = require("./models/UserBio");
const TOR = require("./models/TOR");
const TORMatch = require("./models/TORMatch");
const userRouter = require("./routes/userRoute");
const vendorProfileRouter = require("./routes/vendorProfileRoute");
const userBioRouter = require("./routes/userBioRoute");
const torRouter = require("./routes/torRoute");
const torMatchRouter = require("./routes/torMatchRoute");

const app = express();
const PORT = process.env.PORT || 5175;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is required. Add the MongoDB Atlas URI to backend/.env.");
}

app.use(cors());
app.use(express.json());
app.use("/api/users", userRouter);
app.use("/api/vendor-profiles", vendorProfileRouter);
app.use("/api/user-bios", userBioRouter);
app.use("/api/tors", torRouter);
app.use("/api/tor-matches", torMatchRouter);

app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Express!" });
});

// Endpoint to manually trigger the SME-GP API synchronization
app.post("/api/tors/sync", async (req, res) => {
  try {
    const result = await smegpSyncService.runSync();
    res.json({ message: "Sync completed successfully", data: result });
  } catch (error) {
    console.error("Manual sync failed:", error);
    res.status(500).json({ message: "Sync failed", error: error.message });
  }
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: "Torrent" });
    await Promise.all([
      User.init(),
      VendorProfile.init(),
      UserBio.init(),
      TOR.init(),
      TORMatch.init(),
    ]);
    console.log("Connected to MongoDB Atlas");

    // Schedule the auto-updater to run at 12:00 AM (midnight) every day.
    // The cron string "0 0 * * *" corresponds to Minute: 0, Hour: 0, Day of Month: *, Month: *, Day of Week: *.
    cron.schedule("0 0 * * *", async () => {
      console.log("Running scheduled SME-GP API sync at midnight");
      try {
        await smegpSyncService.runSync();
      } catch (error) {
        console.error("Scheduled sync failed:", error);
      }
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

startServer();
