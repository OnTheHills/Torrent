require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/authRoute");
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
const syncRouter = require("./routes/syncRoute");
const { startCronJobs } = require("./utils/smeGp");

// This file is the composition root: it connects infrastructure, middleware,
// and routers. Feature logic should live in controllers/services instead.
const app = express();
const PORT = process.env.PORT || 5175;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error(
    "MONGO_URI is required. Add the MongoDB Atlas URI to backend/.env.",
  );
}

const corsOrigins = process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

// Credentials allow the browser's HTTP-only session cookie to accompany API calls.
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/vendor-profiles", vendorProfileRouter);
app.use("/api/user-bios", userBioRouter);
app.use("/api/tors", torRouter);
app.use("/api/tor-matches", torMatchRouter);
app.use("/api/sync", syncRouter);

app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Express!" });
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

    // Start schedules only after MongoDB is ready, so an early sync can be saved.
    await startCronJobs();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

startServer();
