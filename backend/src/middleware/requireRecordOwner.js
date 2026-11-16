function requireRecordOwner(repository, label) {
  return async (request, response, next) => {
    if (request.user.role === "admin") return next();
    if (!/^[a-f0-9]{24}$/i.test(request.params.id)) {
      return response.status(400).json({ message: "Invalid record ID." });
    }
    try {
      const record = await repository.findById(request.params.id);
      if (!record) return response.status(404).json({ message: `${label} not found.` });
      if (String(record.userId) !== request.user.sub) {
        return response.status(403).json({ message: "Forbidden." });
      }
      return next();
    } catch (error) {
      return response.status(500).json({ message: error.message });
    }
  };
}

// Prevent changing a record's owner first and then deleting it as "your own".
function requireOwnUserId(request, response, next) {
  if (request.user.role === "admin") return next();
  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return response.status(400).json({ message: "Provide a record object." });
  }
  if ((body.userId !== undefined && body.userId !== request.user.sub) ||
      Object.keys(body).some((key) => key.startsWith("$") || key.includes("."))) {
    return response.status(403).json({ message: "Forbidden." });
  }
  body.userId = request.user.sub;
  return next();
}

function requireSafeUserUpdate(request, response, next) {
  if (request.user.role === "admin") return next();
  const fields = ["username", "firstname", "lastname", "picture"];
  if (!request.body || typeof request.body !== "object" || Array.isArray(request.body) ||
      Object.keys(request.body).some((key) => !fields.includes(key))) {
    return response.status(403).json({ message: "Forbidden." });
  }
  return next();
}

module.exports = { requireRecordOwner, requireOwnUserId, requireSafeUserUpdate };
