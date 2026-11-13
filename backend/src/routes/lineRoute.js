const express = require("express");
const {
  getStatus,
  startLink,
  unlink,
  setDigest,
  processWebhook,
} = require("@/controllers/line/lineController");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole } = require("@/middleware/requireRole");

const lineRouter = express.Router();

lineRouter.post("/webhook", processWebhook);

const vendorOrAdmin = [requireAuth, requireRole("vendor", "admin")];

lineRouter.get("/status", ...vendorOrAdmin, getStatus);
lineRouter.post("/link/start", ...vendorOrAdmin, startLink);
lineRouter.post("/unlink", ...vendorOrAdmin, unlink);
lineRouter.patch("/digest", ...vendorOrAdmin, setDigest);

module.exports = lineRouter;
