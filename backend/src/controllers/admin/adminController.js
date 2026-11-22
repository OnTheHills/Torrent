const admin = require("@/services/admin/adminService");
const { runLineWeeklyDigest } = require("@/services/line/lineDigestService");
const { clientMessage, statusOf } = require("@/middleware/errorHandler");
const { errorFields, logger } = require("@/utils/logger");

function send(work) {
  return async function (request, response, next) {
    try {
      return response.status(200).json(await work(request));
    } catch (error) {
      const status = statusOf(error);
      if (status >= 500) return next(error);
      return response.status(status).json({
        message: clientMessage(error, status),
        ...(error?.code ? { code: error.code } : {}),
      });
    }
  };
}

module.exports = {
  runLineDigest: async (_request, response, next) => {
    try {
      return response.json(await runLineWeeklyDigest());
    } catch (error) {
      logger.error("line_digest.manual_run.failed", errorFields(error));
      return next(error);
    }
  },
  applyRules: send((request) => admin.applyRules(request.user, request.body, request.requestId)),
  auditLog: send((request) => admin.auditLog(request.query)),
  bulkTors: send((request) => admin.bulkTors(request.user, request.body, request.requestId)),
  getTor: send((request) => admin.getTor(request.params.id)),
  streamTorPdf: async (request, response, next) => {
    try {
      const { bytes, contentType, filename } = await admin.streamTorPdf(request.params.id);
      response.setHeader("Content-Type", contentType);
      response.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      response.setHeader("Cache-Control", "private, no-store");
      return response.send(bytes);
    } catch (error) {
      const status = statusOf(error);
      if (status >= 500) return next(error);
      return response.status(status).json({ message: clientMessage(error, status) });
    }
  },
  matchJobs: send(() => admin.matchJobs()),
  overview: send(() => admin.overview()),
  previewRules: send((request) => admin.previewRules(request.body)),
  rescore: send((request) => admin.rescore(request.user, request.body.reason, request.requestId)),
  retryMatches: send((request) => admin.retryMatches(request.user, request.body, request.requestId)),
  reviewCertificate: send((request) => admin.reviewCertificate(request.user, request.body, request.requestId)),
  reviewQueue: send((request) => admin.reviewQueue(request.query)),
  reviewTor: send((request) => admin.reviewTor(request.params.id, request.user, request.body, request.requestId)),
  searchTors: send((request) => admin.searchTors(request.query)),
  settings: send(() => admin.settings()),
  sources: send(() => admin.sources()),
  updateTor: send((request) => admin.updateTor(request.params.id, request.user, request.body, request.requestId)),
  getUser: send((request) => admin.getUser(request.params.id)),
  updateUser: send((request) => admin.updateUser(request.params.id, request.user, request.body, request.requestId)),
  users: send(() => admin.users()),
};
