const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { requireMutationAuth } = require("@/middleware/requireMutationAuth");
const { createCsrfProtection, isLineWebhook } = require("@/middleware/csrfProtection");
const { createRateLimiter } = require("@/middleware/rateLimit");
const { securityHeaders } = require("@/middleware/securityHeaders");
const { httpGuards } = require("@/middleware/httpGuards");
const { errorHandler } = require("@/middleware/errorHandler");
const authRouter = require("@/routes/authRoute");
const userRouter = require("@/routes/userRoute");
const vendorProfileRouter = require("@/routes/vendorProfileRoute");
const torRouter = require("@/routes/torRoute");
const torMatchRouter = require("@/routes/torMatchRoute");
const syncRouter = require("@/routes/syncRoute");
const adminRouter = require("@/routes/adminRoute");
const lineRouter = require("@/routes/lineRoute");
const emailAlertRouter = require("@/routes/emailAlertRoute");
const notificationRouter = require("@/routes/notificationRoute");

// Configure the HTTP application. Database connection and jobs start in server.js.
const app = express();
const corsOrigins = process.env.CORS_ORIGIN.split(",").map((origin) =>
  origin.trim(),
);

app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
app.use(httpGuards);
app.use(securityHeaders);

// Credentials allow the browser's HTTP-only session cookie to accompany API calls.
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());
const csrf = createCsrfProtection(corsOrigins);

const csrfRateLimit = createRateLimiter({
  name: "csrf",
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_CSRF_MAX) || 60,
});
const googleAuthRateLimit = createRateLimiter({
  name: "google-auth",
  windowMs: 15 * 60_000,
  max: Number(process.env.RATE_LIMIT_GOOGLE_AUTH_MAX) || 20,
});
const adminWriteRateLimit = createRateLimiter({
  name: "admin-write",
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_ADMIN_WRITE_MAX) || 120,
});

app.get("/api/auth/csrf", csrfRateLimit, csrf.issueToken);

// Reject unauthenticated writes before parsing JSON or accepting file uploads.
app.use(requireMutationAuth);
app.use(csrf.protect);
app.use((request, response, next) => {
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    request.method !== "OPTIONS" &&
    /^\/api\/admin(?:\/|$)/i.test(request.path)
  ) {
    return adminWriteRateLimit(request, response, next);
  }
  return next();
});
// Preserve raw bytes for LINE webhook HMAC (x-line-signature).
const jsonLimit = process.env.JSON_BODY_LIMIT || "256kb";
app.use(
  express.json({
    limit: jsonLimit,
    verify: (req, _res, buf) => {
      if (isLineWebhook(req)) {
        req.rawBody = buf;
      }
    },
  }),
);

app.use((request, response, next) => {
  if (request.method === "POST" && /^\/api\/auth\/google\/?$/i.test(request.path)) {
    return googleAuthRateLimit(request, response, next);
  }
  return next();
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/vendor-profiles", vendorProfileRouter);
app.use("/api/tors", torRouter);
app.use("/api/tor-matches", torMatchRouter);
app.use("/api/sync", syncRouter);
app.use("/api/admin", adminRouter);
app.use("/api/line", lineRouter);
app.use("/api/email-alerts", emailAlertRouter);
app.use("/api/notifications", notificationRouter);

function diagnosticsEnabled() {
  if (process.env.ENABLE_DIAGNOSTICS === "true") return true;
  if (process.env.ENABLE_DIAGNOSTICS === "false") return false;
  return process.env.NODE_ENV !== "production";
}

if (diagnosticsEnabled()) {
  app.get("/", (_req, res) => {
    res.json({ message: "Backend is running" });
  });

  app.get("/api/hello", (_req, res) => {
    res.json({ message: "Hello from Express!" });
  });
}

app.use(errorHandler);

module.exports = app;
