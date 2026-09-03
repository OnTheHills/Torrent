const express = require("express");
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole, requireSelfOrAdmin } = require("../middleware/requireRole");

const userRouter = express.Router();

userRouter.post("/", requireAuth, requireRole("admin"), createUser);
userRouter.get("/", requireAuth, requireRole("admin"), getAllUsers);
userRouter.get("/:id", requireAuth, requireSelfOrAdmin, getUserById);
userRouter.patch("/:id", requireAuth, requireSelfOrAdmin, updateUser);
userRouter.delete("/:id", requireAuth, requireRole("admin"), deleteUser);

module.exports = userRouter;