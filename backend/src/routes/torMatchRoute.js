const express = require("express");
const {
  ensureTorMatchScores,
  getAllTorMatches,
  getPendingTorMatchIds,
  getMyTorMatches,
  setMyMatchDismissed,
  getTorMatchById,
  updateTorMatch,
  deleteTorMatch,
} = require("@/controllers/tor/torMatchController");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole } = require("@/middleware/requireRole");

const torMatchRouter = express.Router();
torMatchRouter.use(requireAuth, requireRole("vendor", "admin"));

torMatchRouter.get("/mine", requireAuth, getMyTorMatches);
torMatchRouter.patch("/mine/:id", requireAuth, setMyMatchDismissed);
torMatchRouter.post("/ensure", requireAuth, ensureTorMatchScores);
torMatchRouter.get("/pending", getPendingTorMatchIds);
torMatchRouter.get("/", requireRole("admin"), getAllTorMatches);
torMatchRouter.get("/:id", requireRole("admin"), getTorMatchById);
torMatchRouter.patch("/:id", requireRole("admin"), updateTorMatch);
torMatchRouter.delete("/:id", requireRole("admin"), deleteTorMatch);

module.exports = torMatchRouter;
