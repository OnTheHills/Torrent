const express = require("express");
const {
  createTor,
  getAllTors,
  getTorById,
  updateTor,
  deleteTor,
} = require("@/controllers/torController");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole } = require("@/middleware/requireRole");

const torRouter = express.Router();
const adminOnly = [requireAuth, requireRole("admin")];

torRouter.post("/", ...adminOnly, createTor);
torRouter.get("/", getAllTors);
torRouter.get("/:id", getTorById);
torRouter.patch("/:id", ...adminOnly, updateTor);
torRouter.delete("/:id", ...adminOnly, deleteTor);

module.exports = torRouter;
