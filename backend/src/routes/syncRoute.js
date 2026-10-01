const express = require("express");
const {
  triggerBmaEgp2Sync,
  triggerEgpRssSync,
  triggerBmaOcr,
  triggerSmeGpSync,
  triggerSyncAll,
} = require("@/controllers/syncController");

const syncRouter = express.Router();

syncRouter.post("/", triggerSyncAll);
syncRouter.post("/all", triggerSyncAll);
syncRouter.post("/sme-gp", triggerSmeGpSync);
syncRouter.post("/bma-egp2", triggerBmaEgp2Sync);
syncRouter.post("/egp-rss", triggerEgpRssSync);
syncRouter.post("/ocr", triggerBmaOcr);

module.exports = syncRouter;
