const admin = require("@/services/admin/adminService");

function send(work) {
  return async function (request, response) {
    try {
      return response.status(200).json(await work(request));
    } catch (error) {
      return response.status(error.statusCode || 500).json({ message: error.message });
    }
  };
}

module.exports = {
  applyRules: send((request) => admin.applyRules(request.user, request.body)),
  auditLog: send((request) => admin.auditLog(request.query)),
  bulkTors: send((request) => admin.bulkTors(request.user, request.body)),
  getTor: send((request) => admin.getTor(request.params.id)),
  streamTorPdf: async (request, response) => {
    try {
      const { bytes, contentType, filename } = await admin.streamTorPdf(request.params.id);
      response.setHeader("Content-Type", contentType);
      response.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      response.setHeader("Cache-Control", "private, max-age=300");
      return response.send(bytes);
    } catch (error) {
      return response.status(error.statusCode || 500).json({ message: error.message });
    }
  },
  matchJobs: send(() => admin.matchJobs()),
  overview: send(() => admin.overview()),
  previewRules: send((request) => admin.previewRules(request.body)),
  rescore: send((request) => admin.rescore(request.user, request.body.reason)),
  retryMatches: send((request) => admin.retryMatches(request.user, request.body)),
  reviewCertificate: send((request) => admin.reviewCertificate(request.user, request.body)),
  reviewQueue: send((request) => admin.reviewQueue(request.query)),
  reviewTor: send((request) => admin.reviewTor(request.params.id, request.user, request.body)),
  searchTors: send((request) => admin.searchTors(request.query)),
  settings: send(() => admin.settings()),
  sources: send(() => admin.sources()),
  updateTor: send((request) => admin.updateTor(request.params.id, request.user, request.body)),
  updateUser: send((request) => admin.updateUser(request.params.id, request.user, request.body)),
  users: send(() => admin.users()),
};
