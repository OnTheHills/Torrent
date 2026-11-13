const express = require("express");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole } = require("@/middleware/requireRole");
const { getPreferences, savePreferences } = require("@/controllers/email/emailAlertController");

const router = express.Router();
router.use(requireAuth, requireRole("vendor", "admin"));
router.get("/preferences", getPreferences);
router.put("/preferences", savePreferences);

module.exports = router;
