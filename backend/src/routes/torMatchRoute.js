const express = require("express");
const {
  createTorMatch,
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
const { requireRecordOwner, requireOwnUserId } = require("@/middleware/requireRecordOwner");
const torMatches = require("@/repositories/tor/torMatchRepository");

const torMatchRouter = express.Router();
torMatchRouter.use(requireAuth, requireRole("vendor", "admin"));
const ownerOnly = requireRecordOwner(torMatches, "TOR match");

torMatchRouter.post("/", createTorMatch);
torMatchRouter.get("/mine", requireAuth, getMyTorMatches);
torMatchRouter.patch("/mine/:id", requireAuth, setMyMatchDismissed);
torMatchRouter.post("/ensure", requireAuth, ensureTorMatchScores);
torMatchRouter.get("/pending", getPendingTorMatchIds);
torMatchRouter.get("/", getAllTorMatches);
torMatchRouter.get("/:id", getTorMatchById);
torMatchRouter.patch("/:id", ownerOnly, requireOwnUserId, updateTorMatch);
torMatchRouter.delete("/:id", ownerOnly, deleteTorMatch);

module.exports = torMatchRouter;
