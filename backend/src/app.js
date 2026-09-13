import express, { json } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "@/routes/authRoute";
import userRouter from "@/routes/userRoute";
import vendorProfileRouter from "@/routes/vendorProfileRoute";
import userBioRouter from "@/routes/userBioRoute";
import torRouter from "@/routes/torRoute";
import torMatchRouter from "@/routes/torMatchRoute";
import syncRouter from "@/routes/syncRoute";

// Configure the HTTP application. Database connection and jobs start in server.js.
const app = express();
const corsOrigins = process.env.CORS_ORIGIN.split(",").map((origin) =>
  origin.trim(),
);

// Credentials allow the browser's HTTP-only session cookie to accompany API calls.
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(json());
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

export default app;
