const express = require("express");
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("@/controllers/user/userController");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole, requireSelfOrAdmin } = require("@/middleware/requireRole");
const { requireSafeUserUpdate } = require("@/middleware/requireRecordOwner");
const watchlist = require("@/services/user/watchlistService");
const { sendJson } = require("@/middleware/errorHandler");

const userRouter = express.Router();
userRouter.use(requireAuth);
userRouter.use("/me/watchlist", (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  // This header only checks ownership against the session; it cannot select an owner.
  const expectedOwner = req.get("x-watchlist-owner");
  if (expectedOwner && expectedOwner !== req.user.sub) {
    return res.status(409).json({ message: "Your account changed. Refresh and try again." });
  }
  return next();
});
// Owner always comes from the authenticated session, never a supplied user ID.
userRouter.get("/me/watchlist", sendJson((req) => watchlist.getWatchlist(req.user.sub)));
userRouter.put("/me/watchlist/:torId", sendJson((req) => watchlist.setSaved(req.user.sub, req.params.torId, true)));
userRouter.delete("/me/watchlist/:torId", sendJson((req) => watchlist.setSaved(req.user.sub, req.params.torId, false)));
userRouter.use(requireRole("vendor", "admin"));

userRouter.get("/", requireAuth, requireRole("admin"), getAllUsers);
userRouter.get("/:id", requireAuth, requireSelfOrAdmin, getUserById);
userRouter.patch("/:id", requireAuth, requireSelfOrAdmin, requireSafeUserUpdate, updateUser);
userRouter.delete("/:id", requireAuth, requireSelfOrAdmin, deleteUser);

module.exports = userRouter;
