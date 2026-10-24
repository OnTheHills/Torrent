const express = require("express");
const { devAdminLogin, googleLogin, me, logout } = require("@/controllers/authController");
const { requireAuth } = require("@/middleware/requireAuth");

const authRouter = express.Router();

authRouter.post("/google", googleLogin);
authRouter.post("/dev-admin", devAdminLogin);
authRouter.get("/me", requireAuth, me);
authRouter.post("/logout", logout);

module.exports = authRouter;