const userRepository = require("@/repositories/user/userRepository");
const {
  COOKIE_NAME,
  verifyUserToken,
  signUserToken,
  cookieOptions,
} = require("@/utils/session");

async function requireAuth(request, response, next) {
  const token = request.cookies?.[COOKIE_NAME];

  if (!token) {
    return response.status(401).json({ message: "Not signed in." });
  }

  let claims;
  try {
    claims = verifyUserToken(token);
  } catch {
    return response.status(401).json({ message: "Session expired or invalid." });
  }

  try {
    const user = await userRepository.findAuthById(claims.sub);
    if (!user || user.disabled) {
      return response.status(401).json({ message: "Not signed in." });
    }

    const sub = user._id.toString();
    const role = user.role;
    const email = user.email;
    request.user = { sub, role, email };

    if (claims.role !== role || claims.email !== email) {
      response.cookie(
        COOKIE_NAME,
        signUserToken({ _id: user._id, role, email }),
        cookieOptions(),
      );
    }

    return next();
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

module.exports = { requireAuth };
