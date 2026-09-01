const express = require("express");
const {
  createUserBio,
  getAllUserBios,
  getUserBioById,
  updateUserBio,
  deleteUserBio,
} = require("../controllers/userBioController");

const userBioRouter = express.Router();

userBioRouter.post("/", createUserBio);
userBioRouter.get("/", getAllUserBios);
userBioRouter.get("/:id", getUserBioById);
userBioRouter.patch("/:id", updateUserBio);
userBioRouter.delete("/:id", deleteUserBio);

module.exports = userBioRouter;
