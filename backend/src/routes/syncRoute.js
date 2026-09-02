const express = require("express");
const { triggerSync } = require("../controllers/syncController");

const syncRouter = express.Router();

syncRouter.post("/sme-gp", triggerSync);

module.exports = syncRouter;
