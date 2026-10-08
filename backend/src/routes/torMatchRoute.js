const express = require("express");
const {
  createTorMatch,
  getAllTorMatches,
  getPendingTorMatchIds,
  getMyTorMatches,
  setMyMatchDismissed,
  getTorMatchById,
  updateTorMatch,
  deleteTorMatch,
} = require("@/controllers/torMatchController");
const { requireAuth } = require("@/middleware/requireAuth");

const torMatchRouter = express.Router();

torMatchRouter.post("/", createTorMatch);
torMatchRouter.get("/mine", requireAuth, getMyTorMatches);
torMatchRouter.patch("/mine/:id", requireAuth, setMyMatchDismissed);
torMatchRouter.get("/pending", getPendingTorMatchIds);
torMatchRouter.get("/", getAllTorMatches);
torMatchRouter.get("/:id", getTorMatchById);
torMatchRouter.patch("/:id", updateTorMatch);
torMatchRouter.delete("/:id", deleteTorMatch);

module.exports = torMatchRouter;
