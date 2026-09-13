const authService = require("@/services/auth/authService");
const {
  COOKIE_NAME,
  signUserToken,
  cookieOptions,
} = require("@/utils/session");

function setSession(response, user) {
  response.cookie(COOKIE_NAME, signUserToken(user), cookieOptions());
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
    setSession(response, user);
    return response.status(200).json(publicUser);
  } catch (error) {
    return response.status(error.statusCode || 500).json({ message: error.message });
  }
}

async function me(request, response) {
  try {
    const user = await authService.getCurrentUser(request.user.sub);

    if (!user) {
      return response.status(401).json({ message: "Not signed in." });
    }

    return response.status(200).json(user);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function logout(request, response) {
  response.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
  return response.status(200).json({ ok: true });
}

module.exports = { googleLogin, me, logout };
