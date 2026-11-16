const express = require("express");
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("@/controllers/user/userController");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole, requireSelfOrAdmin } = require("@/middleware/requireRole");
const { requireSafeUserUpdate } = require("@/middleware/requireRecordOwner");

const userRouter = express.Router();
userRouter.use(requireAuth, requireRole("vendor", "admin"));

userRouter.post("/", requireAuth, requireRole("admin"), createUser);
userRouter.get("/", requireAuth, requireRole("admin"), getAllUsers);
userRouter.get("/:id", requireAuth, requireSelfOrAdmin, getUserById);
userRouter.patch("/:id", requireAuth, requireSelfOrAdmin, requireSafeUserUpdate, updateUser);
userRouter.delete("/:id", requireAuth, requireSelfOrAdmin, deleteUser);

module.exports = userRouter;
