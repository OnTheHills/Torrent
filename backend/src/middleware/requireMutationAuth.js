const { requireAuth } = require("./requireAuth");
const { securityLog } = require("@/utils/securityLog");

const PUBLIC_READ_PATHS = [
  /^\/api\/tors\/?$/i,
  /^\/api\/tors\/(?:budget-peers|top-departments-by-budget|category-distribution|[a-f0-9]{24})\/?$/i,
];
const DIAGNOSTIC_READ_PATHS = [/^\/api\/hello\/?$/i];
const VENDOR_API_PATH = /^\/api\/(?:tors|tor-matches|line|email-alerts|auth|vendor-profiles|users|notifications)(?:\/|$)/i;
const PUBLIC_POST_PATHS = [
  /^\/api\/auth\/google\/?$/i,
  /^\/api\/line\/webhook\/?$/i,
];

function diagnosticsEnabled() {
  if (process.env.ENABLE_DIAGNOSTICS === "true") return true;
  if (process.env.ENABLE_DIAGNOSTICS === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function requireMutationAuth(request, response, next) {
  if (!/^\/api(?:\/|$)/i.test(request.path) || request.method === "OPTIONS") return next();
  if (
    ["GET", "HEAD"].includes(request.method) &&
    PUBLIC_READ_PATHS.some((path) => path.test(request.path))
  ) {
    return next();
  }
  if (
    diagnosticsEnabled() &&
    ["GET", "HEAD"].includes(request.method) &&
    DIAGNOSTIC_READ_PATHS.some((path) => path.test(request.path))
  ) {
    return next();
  }

  // Google verifies the login credential before issuing a session. LINE's
  // webhook verifies its HMAC signature instead of using a browser session.
  if (request.method === "POST" &&
      PUBLIC_POST_PATHS.some((path) => path.test(request.path))) {
    return next();
  }

  return requireAuth(request, response, () => {
    const { role } = request.user;
    const ownSession =
      (["GET", "HEAD"].includes(request.method) && /^\/api\/auth\/me\/?$/i.test(request.path)) ||
      (request.method === "POST" && /^\/api\/auth\/logout\/?$/i.test(request.path));
    const ownWatchlist =
      (["GET", "HEAD"].includes(request.method) && /^\/api\/users\/me\/watchlist\/?$/i.test(request.path)) ||
      (["PUT", "DELETE"].includes(request.method) && /^\/api\/users\/me\/watchlist\/[a-f0-9]{24}\/?$/i.test(request.path));

    if (role === "admin" || ownSession || ownWatchlist ||
        (role === "vendor" && VENDOR_API_PATH.test(request.path))) return next();

    securityLog("authz_denied", { outcome: "denied", status: 403, reason: "mutation_role" }, request);
    return response.status(403).json({ message: "Forbidden." });
  });
}

module.exports = { requireMutationAuth };
