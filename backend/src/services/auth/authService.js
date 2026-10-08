const userRepository = require("@/repositories/userRepository");
const { verifyGoogleIdToken } = require("@/utils/googleAuth");

function signupRole(role) {
  return role === "vendor" || role === "public" ? role : "public";
}

function toPublicUser(user) {
  const json = user.toObject();
  delete json.passwordHash;
  return json;
}

function authError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function loginWithGoogle(credential, requestedRole) {
  let profile;
  try {
    profile = await verifyGoogleIdToken(credential);
  } catch {
    throw authError("Invalid Google credential.", 401, "invalid_credential");
  }

  const registering = requestedRole === "vendor" || requestedRole === "public";
  let user = await userRepository.findByGoogleId(profile.googleId);

  if (!user) {
    user = await userRepository.findByEmail(profile.email);
  }

  if (user?.googleId && user.googleId !== profile.googleId) {
    throw authError(
      "Email already linked to another Google account.",
      409,
      "email_linked",
    );
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
    throw authError(
      "This email is not registered. Create an account first.",
      404,
      "email_unknown",
    );
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
    });
  }

  return { publicUser: toPublicUser(user), user };
}

async function getCurrentUser(id) {
  return userRepository.findPublicById(id);
}

module.exports = { getCurrentUser, loginWithGoogle };
