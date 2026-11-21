const { randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { readSecret } = require("@/config/secrets");

const SESSION_COOKIE_BASE = "torrent_session";
const HOST_SESSION_COOKIE = `__Host-${SESSION_COOKIE_BASE}`;

/** Match CSRF: Host-prefixed Secure cookies in production / COOKIE_SECURE. */
function useHostCookies() {
  return process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
}

function sessionCookieName() {
  return useHostCookies() ? HOST_SESSION_COOKIE : SESSION_COOKIE_BASE;
}

/** Accept either name so local→prod cutovers and mixed tabs keep working. */
function readSessionToken(cookies) {
  if (!cookies) return undefined;
  const token = cookies[HOST_SESSION_COOKIE] || cookies[SESSION_COOKIE_BASE];
  return typeof token === "string" && token ? token : undefined;
}

function parseDurationMs(value, fallbackMs) {
  const raw = String(value || "").trim();
  const match = /^(\d+)([smhd])$/i.exec(raw);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}

function sessionMaxAgeMs() {
  return parseDurationMs(process.env.JWT_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);
}

function signUserToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
      jti: randomUUID(),
    },
    readSecret("JWT_SECRET", { required: true }),
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

function verifyUserToken(token) {
  return jwt.verify(token, readSecret("JWT_SECRET", { required: true }));
}

function cookieOptions() {
  const secure = useHostCookies();
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: sessionMaxAgeMs(),
  };
}

/** Clear both possible cookie names (legacy + Host-prefixed). */
function clearSessionCookies(response) {
  const options = { ...cookieOptions(), maxAge: 0 };
  response.clearCookie(SESSION_COOKIE_BASE, options);
  response.clearCookie(HOST_SESSION_COOKIE, {
    ...options,
    secure: true,
  });
}

module.exports = {
  SESSION_COOKIE_BASE,
  HOST_SESSION_COOKIE,
  useHostCookies,
  sessionCookieName,
  readSessionToken,
  sessionMaxAgeMs,
  signUserToken,
  verifyUserToken,
  cookieOptions,
  clearSessionCookies,
  // Prefer sessionCookieName(); kept for older call sites/tests.
  get COOKIE_NAME() {
    return sessionCookieName();
  },
};
