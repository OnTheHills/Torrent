const express = require("express");
const {
  getAllTors,
  getBudgetPeers,
  getTopDepartmentsByBudget,
  getCategoryDistribution,
  getTorById,
  updateTor,
  deleteTor,
} = require("@/controllers/tor/torController");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole } = require("@/middleware/requireRole");

const torRouter = express.Router();
const adminOnly = [requireAuth, requireRole("admin")];

torRouter.get("/", getAllTors);
torRouter.get("/budget-peers", getBudgetPeers);
torRouter.get("/top-departments-by-budget", getTopDepartmentsByBudget);
torRouter.get("/category-distribution", getCategoryDistribution);
torRouter.get("/:id", getTorById);
torRouter.patch("/:id", ...adminOnly, updateTor);
torRouter.delete("/:id", ...adminOnly, deleteTor);

module.exports = torRouter;
