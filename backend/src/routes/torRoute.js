const express = require("express");
const {
  createTor,
  getAllTors,
  getTorById,
  updateTor,
  deleteTor,
} = require("../controllers/torController");

const torRouter = express.Router();

torRouter.post("/", createTor);
torRouter.get("/", getAllTors);
torRouter.get("/:id", getTorById);
torRouter.patch("/:id", updateTor);
torRouter.delete("/:id", deleteTor);

module.exports = torRouter;
