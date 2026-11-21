const lineService = require("@/services/line/lineService");
const { securityLog } = require("@/utils/securityLog");
const { clientMessage, statusOf } = require("@/middleware/errorHandler");

function send(work) {
  return async (req, res, next) => {
    try {
      return res.json(await work(req));
    } catch (error) {
      const status = statusOf(error);
      if (status >= 500) return next(error);
      return res.status(status).json({ message: clientMessage(error, status) });
    }
  };
}

function processWebhook(req, res) {
  if (!lineService.verifySignature(req.rawBody, req.get("x-line-signature"))) {
    securityLog("line_webhook", { outcome: "denied", reason: "invalid_signature" }, req);
    return res.status(401).json({ message: "Invalid signature" });
  }
  res.status(200).end();
  void lineService.processWebhookEvents(req.body?.events || []);
}

module.exports = {
  getStatus: send((req) => lineService.getStatus(req.user.sub)),
  startLink: send((req) => lineService.startLink(req.user.sub)),
  unlink: send((req) => lineService.unlink(req.user.sub)),
  setDigest: send((req) => lineService.setDigest(req.user.sub, req.body?.enabled)),
  processWebhook,
};
