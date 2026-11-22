const { logger } = require("@/utils/logger");
const { routeTemplate } = require("@/middleware/requestLogger");

function clientIp(request) {
  if (!request) return undefined;
  return request.ip || request.socket?.remoteAddress || undefined;
}

function securityLog(event, fields = {}, request) {
  const status = Number(fields.status);
  const level = event === "unexpected_error" || status >= 500
    ? "error"
    : fields.outcome === "denied" || fields.outcome === "failure"
      ? "warn"
      : "info";
  const metadata = { logType: "security" };
  if (request) {
    metadata.requestId = request.requestId;
    metadata.method = request.method;
    metadata.route = routeTemplate(request);
    metadata.clientIp = clientIp(request);
    metadata.actorId = request.user?.sub || fields.actorId;
    metadata.actorRole = request.user?.role || fields.actorRole;
  }
  logger[level](event, { ...fields, ...metadata });
}

module.exports = { securityLog, clientIp, routeTemplate };
