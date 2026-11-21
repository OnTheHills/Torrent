const authService = require("@/services/auth/authService");
const { revokeJti } = require("@/services/auth/sessionRevocation");
const {
  sessionCookieName,
  readSessionToken,
  signUserToken,
  verifyUserToken,
  cookieOptions,
  clearSessionCookies,
} = require("@/utils/session");

function setSession(response, user) {
  response.cookie(sessionCookieName(), signUserToken(user), cookieOptions());
}

async function googleLogin(request, response) {
  try {
    const { credential, role: requestedRole } = request.body;

    if (!credential) {
      return response.status(400).json({ message: "Missing Google credential." });
    }

    const { publicUser, user } = await authService.loginWithGoogle(
      credential,
      requestedRole,
    );
    // Replace any previous browser session cookie (including legacy name).
    clearSessionCookies(response);
    setSession(response, user);
    return response.status(200).json(publicUser);
  } catch (error) {
    return response.status(error.statusCode || 500).json({
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
    });
  }
}

async function me(request, response) {
  try {
    const user = await authService.getCurrentUser(request.user.sub);

    if (!user || user.disabled) {
      return response.status(401).json({ message: "Not signed in." });
    }

    return response.status(200).json(user);
  } catch (error) {
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
    } catch {
      // Cookie clear still proceeds when the token is already invalid.
    }
  }

  clearSessionCookies(response);
  return response.status(200).json({ ok: true });
}

module.exports = { googleLogin, me, logout };
