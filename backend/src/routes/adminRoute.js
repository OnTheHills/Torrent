const express = require("express");
const admin = require("@/controllers/adminController");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole } = require("@/middleware/requireRole");
const { runLineWeeklyDigest } = require("@/jobs/lineWeeklyDigest");

const adminRouter = express.Router();

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/overview", admin.overview);
adminRouter.get("/sources", admin.sources);
adminRouter.get("/review", admin.reviewQueue);
adminRouter.post("/review/rescore", admin.rescore);
adminRouter.post("/review/:id", admin.reviewTor);
adminRouter.get("/tors", admin.searchTors);
adminRouter.post("/tors/bulk", admin.bulkTors);
adminRouter.get("/tors/:id", admin.getTor);
adminRouter.get("/tors/:id/pdf", admin.streamTorPdf);
adminRouter.patch("/tors/:id", admin.updateTor);
adminRouter.get("/audit", admin.auditLog);
adminRouter.get("/users", admin.users);
adminRouter.get("/users/:id", admin.getUser);
adminRouter.patch("/users/:id", admin.updateUser);
adminRouter.post("/certificates", admin.reviewCertificate);
adminRouter.get("/matches", admin.matchJobs);
adminRouter.post("/matches/retry", admin.retryMatches);
adminRouter.get("/settings", admin.settings);
adminRouter.post("/settings/preview", admin.previewRules);
adminRouter.post("/settings/apply", admin.applyRules);

// Temporary: run LINE weekly digest on demand (practice / QA)
adminRouter.post("/line-digest/run", async (_req, res) => {
  try {
    const result = await runLineWeeklyDigest();
    res.json(result);
  } catch (err) {
    console.error("line-digest/run failed", err);
    res.status(500).json({ message: err.message || "Digest failed" });
  }
});

module.exports = adminRouter;
