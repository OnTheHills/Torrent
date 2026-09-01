const express = require("express");
const {
  createTorMatch,
  getAllTorMatches,
  getTorMatchById,
  updateTorMatch,
  deleteTorMatch,
} = require("../controllers/torMatchController");

const torMatchRouter = express.Router();

torMatchRouter.post("/", createTorMatch);
torMatchRouter.get("/", getAllTorMatches);
torMatchRouter.get("/:id", getTorMatchById);
torMatchRouter.patch("/:id", updateTorMatch);
torMatchRouter.delete("/:id", deleteTorMatch);

module.exports = torMatchRouter;
