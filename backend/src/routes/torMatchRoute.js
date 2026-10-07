const express = require("express");
const {
  createTorMatch,
  getAllTorMatches,
  getMyTorMatches,
  getTorMatchById,
  updateTorMatch,
  deleteTorMatch,
} = require("@/controllers/torMatchController");
const { requireAuth } = require("@/middleware/requireAuth");

const torMatchRouter = express.Router();

torMatchRouter.post("/", createTorMatch);
torMatchRouter.get("/mine", requireAuth, getMyTorMatches);
torMatchRouter.get("/", getAllTorMatches);
torMatchRouter.get("/:id", getTorMatchById);
torMatchRouter.patch("/:id", updateTorMatch);
torMatchRouter.delete("/:id", deleteTorMatch);

module.exports = torMatchRouter;
