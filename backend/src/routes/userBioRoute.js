const express = require("express");
const {
  createUserBio,
  getAllUserBios,
  getUserBioById,
  updateUserBio,
  deleteUserBio,
} = require("@/controllers/user/userBioController");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole } = require("@/middleware/requireRole");
const { requireRecordOwner, requireOwnUserId } = require("@/middleware/requireRecordOwner");
const userBios = require("@/repositories/user/userBioRepository");

const userBioRouter = express.Router();
userBioRouter.use(requireAuth, requireRole("vendor", "admin"));
const ownerOnly = requireRecordOwner(userBios, "User bio");

userBioRouter.post("/", requireOwnUserId, createUserBio);
userBioRouter.get("/", getAllUserBios);
userBioRouter.get("/:id", getUserBioById);
userBioRouter.patch("/:id", ownerOnly, requireOwnUserId, updateUserBio);
userBioRouter.delete("/:id", ownerOnly, deleteUserBio);

module.exports = userBioRouter;
