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

const torMatchRouter = express.Router();

torMatchRouter.post("/", createTorMatch);
torMatchRouter.get("/mine", requireAuth, getMyTorMatches);
torMatchRouter.patch("/mine/:id", requireAuth, setMyMatchDismissed);
torMatchRouter.post("/ensure", requireAuth, ensureTorMatchScores);
torMatchRouter.get("/pending", getPendingTorMatchIds);
torMatchRouter.get("/", getAllTorMatches);
torMatchRouter.get("/:id", getTorMatchById);
torMatchRouter.patch("/:id", updateTorMatch);
torMatchRouter.delete("/:id", deleteTorMatch);

module.exports = torMatchRouter;
