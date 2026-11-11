const express = require("express");
const User = require("@/models/User");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole } = require("@/middleware/requireRole");
const {
  EMAIL_ALERT_CATEGORIES,
  DEFAULT_EMAIL_ALERT_PREFS,
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

module.exports = router;
