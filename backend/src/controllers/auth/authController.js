const authService = require("@/services/auth/authService");
const { revokeJti } = require("@/services/auth/sessionRevocation");
const { securityLog } = require("@/utils/securityLog");
const {
  sessionCookieName,
  readSessionToken,
  signUserToken,
  verifyUserToken,
  cookieOptions,
  clearSessionCookies,
} = require("@/utils/session");

function setSession(response, user) {
  // Explicit Google credential + CSRF-protected POST is the only session mint path.
  response.cookie(sessionCookieName(), signUserToken(user), cookieOptions());
}

function noStore(response) {
  response.set("Cache-Control", "no-store");
  response.set("Pragma", "no-cache");
}

async function googleLogin(request, response) {
  try {
    const { credential, role: requestedRole, nonce } = request.body || {};

    if (!credential || typeof credential !== "string") {
      securityLog("auth_login", { outcome: "failure", code: "missing_credential" }, request);
      return response.status(400).json({ message: "Missing Google credential." });
    }

    const { publicUser, user } = await authService.loginWithGoogle(
      credential,
      requestedRole,
      { nonce },
    );
    // Replace any previous browser session cookie (including legacy name).
    clearSessionCookies(response);
    setSession(response, user);
    noStore(response);
    securityLog(
      "auth_login",
      {
        outcome: "success",
        actorId: user._id?.toString?.() || String(user._id),
        actorEmail: user.email,
        actorRole: user.role,
        registering: requestedRole === "vendor" || requestedRole === "public",
      },
      request,
    );
    return response.status(200).json(publicUser);
  } catch (error) {
    securityLog(
      "auth_login",
      { outcome: "failure", code: error.code || "auth_error", status: error.statusCode || 500 },
      request,
    );
    const status = error.statusCode || 500;
    noStore(response);
    return response.status(status).json({
      message: status >= 500 ? "Something went wrong." : error.message,
      // Surface only non-enumerating UX codes used by the register flow.
      ...(error.code === "email_registered" ? { code: error.code } : {}),
    });
  }
}

async function me(request, response) {
  try {
    const user = await authService.getCurrentUser(request.user.sub);

    if (!user || user.disabled) {
      noStore(response);
      return response.status(401).json({ message: "Not signed in." });
    }

    noStore(response);
    return response.status(200).json(user);
  } catch {
    noStore(response);
    return response.status(500).json({ message: "Could not load the current user." });
  }
}

async function logout(request, response) {
  const token = readSessionToken(request.cookies);
  if (token) {
    try {
      const claims = verifyUserToken(token);
      if (claims.jti && claims.exp) {
        await revokeJti(claims.jti, claims.exp * 1000);
      }
      securityLog(
        "auth_logout",
        { outcome: "success", actorId: claims.sub },
        request,
      );
    } catch {
      // Cookie clear still proceeds when the token is already invalid.
    }
  }

  clearSessionCookies(response);
  noStore(response);
  // Drop client caches/storage for this origin after session end (ASVS V14.3.1).
  response.set("Clear-Site-Data", '"cookies", "storage"');
  return response.status(200).json({ ok: true });
}

module.exports = { googleLogin, me, logout };
