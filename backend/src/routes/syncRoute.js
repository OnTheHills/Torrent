const express = require("express");
const {
  triggerProcessSync,
  triggerDataGoProcess5Sync,
  triggerEgpOcr,
  triggerBmaEgp2Sync,
  triggerEgpRssSync,
  triggerBmaOcr,
  triggerDataGoSync,
  triggerSmeAnnouncements,
  triggerSyncAll,
} = require("@/controllers/syncController");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireRole } = require("@/middleware/requireRole");

const syncRouter = express.Router();
syncRouter.use(requireAuth, requireRole("admin"));

syncRouter.post("/", triggerSyncAll);
syncRouter.post("/all", triggerSyncAll);
syncRouter.post("/process3-process5", triggerProcessSync);
syncRouter.post("/data-go-process5", triggerDataGoProcess5Sync);
syncRouter.post("/bma-egp2", triggerBmaEgp2Sync);
syncRouter.post("/egp-rss", triggerEgpRssSync);
syncRouter.post("/data-go", triggerDataGoSync);
syncRouter.post("/sme-announcements", triggerSmeAnnouncements);
syncRouter.post("/ocr", triggerEgpOcr);
syncRouter.post("/ocr/bma", triggerBmaOcr);

module.exports = syncRouter;
