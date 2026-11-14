const jwt = require("jsonwebtoken");
const { readSecret } = require("@/config/secrets");

const COOKIE_NAME = "torrent_session";

function signUserToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    readSecret("JWT_SECRET", { required: true }),
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function verifyUserToken(token) {
  return jwt.verify(token, readSecret("JWT_SECRET", { required: true }));
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

module.exports = {
  COOKIE_NAME,
  signUserToken,
  verifyUserToken,
  cookieOptions,
};
