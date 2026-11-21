const userRepository = require("@/repositories/user/userRepository");
const { verifyGoogleIdToken } = require("@/utils/googleAuth");

function signupRole(role) {
  return role === "vendor" || role === "public" ? role : "public";
}

function toPublicUser(user) {
  const json = user.toObject ? user.toObject() : { ...user };
  delete json.passwordHash;
  return json;
}

function authError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * Federated Google login. Session cookies are only created by the controller
 * after this succeeds — never on anonymous GETs (ASVS V7.6.2).
 *
 * Client-facing failures use generic messages so authentication challenges do
 * not reveal whether an email is registered (ASVS V6.3.8). Internal `code`
 * values stay available for server-side security logs.
 */
async function loginWithGoogle(credential, requestedRole, { nonce } = {}) {
  if (!nonce || typeof nonce !== "string" || nonce.length < 16 || nonce.length > 128) {
    throw authError("Sign-in failed.", 401, "invalid_nonce");
  }

  let profile;
  try {
    profile = await verifyGoogleIdToken(credential, { nonce });
  } catch {
    throw authError("Sign-in failed.", 401, "invalid_credential");
  }

  const registering = requestedRole === "vendor" || requestedRole === "public";
  let user = await userRepository.findByGoogleId(profile.googleId);

  if (!user) {
    user = await userRepository.findByEmail(profile.email);
  }

  if (user?.googleId && user.googleId !== profile.googleId) {
    throw authError("Sign-in failed.", 401, "email_linked");
  }

  // Create-account must not reuse an existing email. Log in keeps the saved role.
  if (user && registering) {
    throw authError(
      "This email is already registered. Log in instead.",
      409,
      "email_registered",
    );
  }

  if (!user && !registering) {
    // Same status/message as a bad credential — avoid account enumeration.
    throw authError("Sign-in failed.", 401, "email_unknown");
  }

  if (user?.disabled) {
    throw authError("Sign-in failed.", 401, "account_disabled");
  }

  if (user) {
    Object.assign(user, {
      email: profile.email,
      emailVerified: profile.emailVerified,
      firstname: profile.firstname,
      googleId: profile.googleId,
      lastname: profile.lastname,
      picture: profile.picture,
      provider: "google",
    });
    await userRepository.save(user);
  } else {
    user = await userRepository.create({
      email: profile.email,
      emailVerified: profile.emailVerified,
      firstname: profile.firstname,
      googleId: profile.googleId,
      lastname: profile.lastname,
      picture: profile.picture,
      provider: "google",
      role: signupRole(requestedRole),
      username: profile.email.split("@")[0],
      sessionVersion: 0,
    });
  }

  return { publicUser: toPublicUser(user), user };
}

async function getCurrentUser(id) {
  return userRepository.findPublicById(id);
}

module.exports = { getCurrentUser, loginWithGoogle };
