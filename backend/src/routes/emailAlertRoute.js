const express = require("express");
const User = require("@/models/User");
const { sendEmail } = require("@/jobs/emailAlerts");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole } = require("@/middleware/requireRole");
const {
  EMAIL_ALERT_CATEGORIES,
  DEFAULT_EMAIL_ALERT_PREFS,
  TEST_EMAIL_COOLDOWN_MS,
} = require("@/constants/emailAlertConstants");

const router = express.Router();
router.use(requireAuth, requireRole("vendor", "admin"));

const CATEGORIES = new Set(EMAIL_ALERT_CATEGORIES);

router.get("/preferences", async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select("emailAlertPrefs").lean();
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({
      ...DEFAULT_EMAIL_ALERT_PREFS, ...(user.emailAlertPrefs?.savedAt ? user.emailAlertPrefs : {}),
      deliveryConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/preferences", async (req, res) => {
  const prefs = req.body;
  const valid = prefs &&
    ["emailMatches", "emailDeadlines", "emailIntegrity"].every((key) => typeof prefs[key] === "boolean") &&
    ["budgetMinThb", "budgetMaxThb"].every((key) => Number.isFinite(prefs[key]) && prefs[key] >= 0) &&
    prefs.budgetMaxThb >= prefs.budgetMinThb &&
    Array.isArray(prefs.categories) && prefs.categories.length <= CATEGORIES.size &&
    prefs.categories.every((category) => CATEGORIES.has(category)) &&
    new Set(prefs.categories).size === prefs.categories.length;
  if (!valid) return res.status(400).json({ message: "Invalid email alert preferences." });

  try {
    const current = await User.findById(req.user.sub).select("emailAlertPrefs").lean();
    if (!current) return res.status(404).json({ message: "User not found." });
    const now = new Date();
    const previous = current.emailAlertPrefs || {};
    const saved = {
      emailMatches: prefs.emailMatches,
      emailDeadlines: prefs.emailDeadlines,
      emailIntegrity: prefs.emailIntegrity,
      budgetMinThb: prefs.budgetMinThb,
      budgetMaxThb: prefs.budgetMaxThb,
      categories: prefs.categories,
      savedAt: now,
      matchSince: prefs.emailMatches && previous.emailMatches
        ? previous.matchSince || previous.savedAt || now : now,
      integritySince: prefs.emailIntegrity && previous.emailIntegrity
        ? previous.integritySince || previous.savedAt || now : now,
    };
    const user = await User.findByIdAndUpdate(req.user.sub, { emailAlertPrefs: saved }, { returnDocument: "after" })
      .select("emailAlertPrefs").lean();
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({
      ...user.emailAlertPrefs,
      deliveryConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/test", async (req, res) => {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return res.status(503).json({ message: "Email delivery is not configured." });
  }
  const now = new Date();
  try {
    const user = await User.findOneAndUpdate(
      {
        _id: req.user.sub,
        emailVerified: true,
        disabled: { $ne: true },
        $or: [
          { lastTestEmailAt: { $lte: new Date(now.getTime() - TEST_EMAIL_COOLDOWN_MS) } },
          { lastTestEmailAt: null },
          { lastTestEmailAt: { $exists: false } },
        ],
      },
      { $set: { lastTestEmailAt: now } },
      { returnDocument: "after" },
    ).select("email").lean();
    if (!user) {
      const account = await User.findById(req.user.sub).select("emailVerified").lean();
      if (!account) return res.status(404).json({ message: "User not found." });
      if (!account.emailVerified) return res.status(400).json({ message: "Verify your account email before testing." });
      return res.status(429).json({ message: "Wait five minutes before sending another test email." });
    }
    await sendEmail({
      key: `test:${user._id}:${now.getTime()}`,
      to: user.email,
      subject: "Torrent Smart Alert test",
      text: "Your Torrent Smart Alert email delivery is working. This is a test message; no TOR match was needed.",
    });
    return res.json({ sent: true });
  } catch (error) {
    console.error("Smart Alert test email failed", { userId: req.user.sub, message: error.message });
    return res.status(502).json({ message: `Test email could not be sent: ${error.message}` });
  }
});

module.exports = router;
