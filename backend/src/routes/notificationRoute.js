const express = require("express");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole } = require("@/middleware/requireRole");
const { getMine, markAllRead, updateMine } = require("@/controllers/notificationController");

const router = express.Router();
router.use(requireAuth, requireRole("vendor", "admin"));
router.get("/mine", getMine);
router.patch("/mine/read-all", markAllRead);
router.patch("/mine/:id", updateMine);

module.exports = router;
