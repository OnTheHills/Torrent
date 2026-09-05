const { COOKIE_NAME, verifyUserToken } = require("../utils/session");

function requireAuth(request, response, next) {
  const token = request.cookies?.[COOKIE_NAME];

  if (!token) {
    return response.status(401).json({ message: "Not signed in." });
  }

  try {
    request.user = verifyUserToken(token);
    return next();
  } catch {
    return response.status(401).json({ message: "Session expired or invalid." });
  }
}

module.exports = { requireAuth };
