const jwt = require("jsonwebtoken");

const COOKIE_NAME = "torrent_session";

function signUserToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function verifyUserToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
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