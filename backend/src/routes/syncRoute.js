const express = require("express");
const {
  triggerProcessSync,
  triggerDataGoProcess5Sync,
  triggerEgpOcr,
  triggerSyncAll,
} = require("@/controllers/syncController");

const syncRouter = express.Router();

syncRouter.post("/", triggerSyncAll);
syncRouter.post("/all", triggerSyncAll);
syncRouter.post("/process3-process5", triggerProcessSync);
syncRouter.post("/data-go-process5", triggerDataGoProcess5Sync);
syncRouter.post("/ocr", triggerEgpOcr);

module.exports = syncRouter;
