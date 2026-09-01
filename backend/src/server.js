require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
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

app.use(cors());
app.use(express.json());
app.use("/api/users", userRouter);
app.use("/api/vendor-profiles", vendorProfileRouter);
app.use("/api/user-bios", userBioRouter);
app.use("/api/tors", torRouter);
app.use("/api/tor-matches", torMatchRouter);

const PORT = process.env.PORT || 5175;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is required. Add it to backend/.env.");
}

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    await Promise.all([
      User.init(),
      VendorProfile.init(),
      UserBio.init(),
      TOR.init(),
      TORMatch.init(),
    ]);
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

app.get("/", (req, res) => {
  res.json({
    message: "Backend is running",
  });
});

app.get("/api/hello", (req, res) => {
  res.json({
    message: "Hello from Express!",
  });
});

startServer();
