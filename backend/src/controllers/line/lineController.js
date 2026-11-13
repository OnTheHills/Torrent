const lineService = require("@/services/line/lineService");

function send(work) {
  return async (req, res) => {
    try {
      return res.json(await work(req));
    } catch (error) {
      if (!error.status) throw error;
      return res.status(error.status).json({ message: error.message });
    }
  };
}

function processWebhook(req, res) {
  if (!lineService.verifySignature(req.rawBody, req.get("x-line-signature"))) {
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
