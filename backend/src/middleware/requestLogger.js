const { randomUUID } = require("node:crypto");
const { logger } = require("@/utils/logger");
const API_GROUPS = new Set([
  "auth", "users", "vendor-profiles", "tors", "tor-matches", "sync",
  "admin", "line", "email-alerts", "notifications",
]);

function routeTemplate(request) {
  const route = request.route?.path;
  const segments = String(request.logPath || request.path || "").split("/").filter(Boolean);
  const prefix = request.baseUrl || request.logApiPrefix || "";
  if (typeof route === "string") {
    const base = route.startsWith("/api/") || route === "/api" ? "" : prefix;
    return `${base}${route}` || "/";
  }
  if (Array.isArray(route)) return `${prefix}${route.join("|")}`;

  if (segments[0] === "api") {
    if (!segments[1]) return "/api";
    return API_GROUPS.has(segments[1]) ? `/api/${segments[1]}` : "/api/:param";
  }
  return segments.length ? "unmatched" : "/";
}

function requestLogger(request, response, next) {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();
  request.logPath = request.path;
  const segments = String(request.path || "").split("/").filter(Boolean);
  request.logApiPrefix = segments[0] === "api" && API_GROUPS.has(segments[1])
    ? `/api/${segments[1]}`
    : "";
  request.requestId = requestId;
  response.setHeader("X-Request-Id", requestId);

  response.once("finish", () => {
    const status = response.statusCode;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    logger[level]("http.request.completed", {
      requestId,
      method: request.method,
      route: routeTemplate(request),
      status,
      durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,
      clientIp: request.ip || request.socket?.remoteAddress,
      actorId: request.user?.sub,
      actorRole: request.user?.role,
    });
  });

  return next();
}

module.exports = { requestLogger, routeTemplate };
