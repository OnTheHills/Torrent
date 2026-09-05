const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/authRoute");
const userRouter = require("./routes/userRoute");
const vendorProfileRouter = require("./routes/vendorProfileRoute");
const userBioRouter = require("./routes/userBioRoute");
const torRouter = require("./routes/torRoute");
const torMatchRouter = require("./routes/torMatchRoute");
const syncRouter = require("./routes/syncRoute");

// Configure the HTTP application. Database connection and jobs start in server.js.
const app = express();
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

module.exports = app;
