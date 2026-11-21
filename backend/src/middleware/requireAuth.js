const userRepository = require("@/repositories/user/userRepository");
const { isRevoked, revokeJti } = require("@/services/auth/sessionRevocation");
const {
  sessionCookieName,
  readSessionToken,
  verifyUserToken,
  signUserToken,
  cookieOptions,
} = require("@/utils/session");

// Re-issue the cookie when at least half the lifetime has elapsed (sliding window).
function shouldRefresh(claims) {
  if (typeof claims.iat !== "number" || typeof claims.exp !== "number") return false;
  const lifetime = claims.exp - claims.iat;
  if (lifetime <= 0) return false;
  const age = Math.floor(Date.now() / 1000) - claims.iat;
  return age >= lifetime / 2;
}

async function requireAuth(request, response, next) {
  const token = readSessionToken(request.cookies);

  if (!token) {
    return response.status(401).json({ message: "Not signed in." });
  }

  let claims;
  try {
    claims = verifyUserToken(token);
  } catch {
    return response.status(401).json({ message: "Session expired or invalid." });
  }

  if (await isRevoked(claims.jti)) {
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
    request.user = { sub, role, email, jti: claims.jti };

    const claimsStale = claims.role !== role || claims.email !== email;
    const slide = shouldRefresh(claims);
    if (claimsStale || slide) {
      // Only invalidate the prior jti on time-based rotation. Role/email cookie
      // refreshes keep the request's token usable for the rest of the suite /
      // in-flight tabs; DB role remains authoritative either way.
      if (slide && claims.jti && claims.exp) {
        await revokeJti(claims.jti, claims.exp * 1000);
      }
      const nextToken = signUserToken({ _id: user._id, role, email });
      const nextClaims = verifyUserToken(nextToken);
      request.user.jti = nextClaims.jti;
      response.cookie(sessionCookieName(), nextToken, cookieOptions());
    }

    return next();
  } catch (error) {
    return response.status(500).json({ message: "Authentication failed." });
  }
}

module.exports = { requireAuth };
