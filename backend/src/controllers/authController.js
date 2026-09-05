const User = require("../models/User");
const { verifyGoogleIdToken } = require("../utils/googleAuth");
const {
  COOKIE_NAME,
  signUserToken,
  cookieOptions,
} = require("../utils/session");

function toPublicUser(user) {
  const json = user.toObject();
  delete json.passwordHash;
  return json;
}

function setSession(response, user) {
  response.cookie(COOKIE_NAME, signUserToken(user), cookieOptions());
}

/** First signup only. Ignore admin (and anything else) from the client. */
function signupRoleFromBody(role) {
  if (role === "vendor" || role === "public") {
    return role;
  }
  return "public";
}

async function googleLogin(request, response) {
  try {
    const { credential, role: requestedRole } = request.body;

    if (!credential) {
      return response.status(400).json({ message: "Missing Google credential." });
    }

    let profile;
    try {
      profile = await verifyGoogleIdToken(credential);
    } catch {
      return response.status(401).json({ message: "Invalid Google credential." });
    }

    let user = await User.findOne({ googleId: profile.googleId });

    if (user) {
      user.picture = profile.picture;
      user.firstname = profile.firstname;
      user.lastname = profile.lastname;
      user.emailVerified = profile.emailVerified;
      user.email = profile.email;
      await user.save();
    } else {
      user = await User.findOne({ email: profile.email });

      if (user && user.googleId && user.googleId !== profile.googleId) {
        return response.status(409).json({
          message: "Email already linked to another Google account.",
        });
      }

      if (user && !user.googleId) {
        user.googleId = profile.googleId;
        user.provider = "google";
        user.firstname = profile.firstname;
        user.lastname = profile.lastname;
        user.picture = profile.picture;
        user.emailVerified = profile.emailVerified;
        await user.save();
      } else if (!user) {
        user = await User.create({
          email: profile.email,
          googleId: profile.googleId,
          provider: "google",
          role: signupRoleFromBody(requestedRole),
          firstname: profile.firstname,
          lastname: profile.lastname,
          picture: profile.picture,
          emailVerified: profile.emailVerified,
          username: profile.email.split("@")[0],
        });
      }
    }

    setSession(response, user);
    return response.status(200).json(toPublicUser(user));
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function me(request, response) {
  try {
    const user = await User.findById(request.user.sub).select("-passwordHash");

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
