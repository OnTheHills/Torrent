const express = require("express");
const { googleLogin, me, logout } = require("../controllers/authController");
const { requireAuth } = require("../middleware/requireAuth");

const authRouter = express.Router();

authRouter.post("/google", googleLogin);
authRouter.get("/me", requireAuth, me);
authRouter.post("/logout", logout);

module.exports = authRouter;