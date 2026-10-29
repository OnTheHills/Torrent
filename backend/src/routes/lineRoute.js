const express = require("express");
const crypto = require("crypto");
const {
  getStatus,
  startLink,
  unlink,
  setDigest,
  processWebhookEvents,
} = require("@/controllers/lineController");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole } = require("@/middleware/requireRole");

const lineRouter = express.Router();

function verifySignature(rawBody, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET || "";
  if (!secret || !signature || !rawBody) return false;

  const hash = crypto.createHmac("SHA256", secret).update(rawBody).digest("base64");
  const expected = Buffer.from(hash);
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

lineRouter.post("/webhook", async (req, res) => {
  const signature = req.get("x-line-signature");
  const rawBody = req.rawBody;

  if (!verifySignature(rawBody, signature)) {
    return res.status(401).json({ message: "Invalid signature" });
  }

  const events = req.body?.events || [];
  // Always ACK fast; process after response is queued.
  res.status(200).end();

  void processWebhookEvents(events);
});

const vendorOrAdmin = [requireAuth, requireRole("vendor", "admin")];

lineRouter.get("/status", ...vendorOrAdmin, getStatus);
lineRouter.post("/link/start", ...vendorOrAdmin, startLink);
lineRouter.post("/unlink", ...vendorOrAdmin, unlink);
lineRouter.patch("/digest", ...vendorOrAdmin, setDigest);

module.exports = lineRouter;
