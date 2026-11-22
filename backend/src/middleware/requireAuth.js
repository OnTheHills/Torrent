const userRepository = require("@/repositories/user/userRepository");
const { isRevoked, revokeJti } = require("@/services/auth/sessionRevocation");
const { securityLog } = require("@/utils/securityLog");
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

function deny(request, response, status, message, reason) {
  securityLog("authz_denied", { outcome: "denied", status, reason }, request);
  return response.status(status).json({ message });
}

async function requireAuth(request, response, next) {
  response.set({ "Cache-Control": "private, no-store", Pragma: "no-cache" });
  const token = readSessionToken(request.cookies);

  if (!token) {
    return deny(request, response, 401, "Not signed in.", "missing_session");
  }

  let claims;
  try {
    claims = verifyUserToken(token);
  } catch {
    return deny(request, response, 401, "Session expired or invalid.", "invalid_token");
  }

  if (await isRevoked(claims.jti)) {
    return deny(request, response, 401, "Session expired or invalid.", "revoked_jti");
  }

  try {
    const user = await userRepository.findAuthById(claims.sub);
    if (!user || user.disabled) {
      return deny(request, response, 401, "Not signed in.", user?.disabled ? "disabled" : "user_missing");
    }

    const sessionVersion = Number(user.sessionVersion) || 0;
    const claimVersion = Number(claims.sv) || 0;
    if (claimVersion !== sessionVersion) {
      return deny(request, response, 401, "Session expired or invalid.", "session_version");
    }

    const sub = user._id.toString();
    const role = user.role;
    const email = user.email;
    request.user = { sub, role, email, jti: claims.jti, sessionVersion };

    const claimsStale = claims.role !== role || claims.email !== email;
    const slide = shouldRefresh(claims);
    if (claimsStale || slide) {
      // Only invalidate the prior jti on time-based rotation. Role/email cookie
      // refreshes keep the request's token usable for the rest of the suite /
      // in-flight tabs; DB role remains authoritative either way.
      if (slide && claims.jti && claims.exp) {
        await revokeJti(claims.jti, claims.exp * 1000);
      }
      const nextToken = signUserToken({
        _id: user._id,
        role,
        email,
        sessionVersion,
      });
      const nextClaims = verifyUserToken(nextToken);
      request.user.jti = nextClaims.jti;
      response.cookie(sessionCookieName(), nextToken, cookieOptions());
    }

    return next();
  } catch (error) {
    securityLog("auth_error", { outcome: "failure", reason: "auth_lookup" }, request);
    return response.status(500).json({ message: "Authentication failed." });
  }
}

module.exports = { requireAuth };
