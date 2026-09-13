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

async function loginWithGoogle(credential, requestedRole) {
  let profile;
  try {
    profile = await verifyGoogleIdToken(credential);
  } catch {
    const error = new Error("Invalid Google credential.");
    error.statusCode = 401;
    throw error;
  }
  let user = await userRepository.findByGoogleId(profile.googleId);

  if (user) {
    Object.assign(user, {
      email: profile.email,
      emailVerified: profile.emailVerified,
      firstname: profile.firstname,
      lastname: profile.lastname,
      picture: profile.picture,
    });
    await userRepository.save(user);
  } else {
    user = await userRepository.findByEmail(profile.email);

    if (user?.googleId && user.googleId !== profile.googleId) {
      const error = new Error("Email already linked to another Google account.");
      error.statusCode = 409;
      throw error;
    }

    if (user) {
      Object.assign(user, {
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
  }

  return { publicUser: toPublicUser(user), user };
}

async function getCurrentUser(id) {
  return userRepository.findPublicById(id);
}

module.exports = { getCurrentUser, loginWithGoogle };
