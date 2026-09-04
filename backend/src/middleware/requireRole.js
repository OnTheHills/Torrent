function requireRole(...allowed) {
  return function (request, response, next) {
    if (!request.user) {
      return response.status(401).json({ message: "Not signed in." });
    }

    if (!allowed.includes(request.user.role)) {
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
    return response.status(403).json({ message: "Forbidden." });
  }

  return next();
}

module.exports = { requireRole, requireSelfOrAdmin };
