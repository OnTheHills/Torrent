const { securityLog } = require("@/utils/securityLog");

function requireRole(...allowed) {
  return function (request, response, next) {
    if (!request.user) {
      securityLog("authz_denied", { outcome: "denied", status: 401, reason: "role_unauthenticated" }, request);
      return response.status(401).json({ message: "Not signed in." });
    }

    if (!allowed.includes(request.user.role)) {
      securityLog("authz_denied", { outcome: "denied", status: 403, reason: "role_forbidden" }, request);
      return response.status(403).json({ message: "Forbidden." });
    }

    return next();
  };
}

function requireSelfOrAdmin(request, response, next) {
  if (!request.user) {
    return response.status(401).json({ message: "Not signed in." });
  }

  const isSelf = request.user.sub === request.params.id;
  const isAdmin = request.user.role === "admin";

  if (!isSelf && !isAdmin) {
    securityLog("authz_denied", { outcome: "denied", status: 403, reason: "self_or_admin" }, request);
    return response.status(403).json({ message: "Forbidden." });
  }

  return next();
}

function requireSelfOrAdminByUserId(request, response, next) {
  if (!request.user) {
    return response.status(401).json({ message: "Not signed in." });
  }

  const isSelf = request.user.sub === request.params.userId;
  const isAdmin = request.user.role === "admin";

  if (!isSelf && !isAdmin) {
    securityLog("authz_denied", { outcome: "denied", status: 403, reason: "self_or_admin_userId" }, request);
    return response.status(403).json({ message: "Forbidden." });
  }

  return next();
}

module.exports = {
  requireRole,
  requireSelfOrAdmin,
  requireSelfOrAdminByUserId,
};
