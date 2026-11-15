const { randomBytes } = require("node:crypto");
const { doubleCsrf } = require("csrf-csrf");
const { COOKIE_NAME } = require("@/utils/session");
const { readSecret } = require("@/config/secrets");

function isLineWebhook(request) {
  return request.method === "POST" && /^\/api\/line\/webhook\/?$/i.test(request.path);
}

function createCsrfProtection(origins) {
  const secret = readSecret("CSRF_SECRET") || readSecret("COOKIE_SECRET") || readSecret("JWT_SECRET");
  if (!secret || secret === "default-fallback-secret-key-change-me") {
    throw new Error("Configure CSRF_SECRET, COOKIE_SECRET, or JWT_SECRET for CSRF protection.");
  }
  const secure = process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
  const prefix = secure ? "__Host-" : "";
  const identityCookie = `${prefix}torrent_csrf_session`;
  const cookieOptions = { httpOnly: true, sameSite: "lax", secure, path: "/" };
  const allowedOrigins = new Set(origins.filter(Boolean));
  const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => secret,
    // Before login, use a random browser identifier. After login, bind tokens
    // to the JWT so a token from another session cannot authorize a write.
    getSessionIdentifier: (request) => request.cookies[COOKIE_NAME] || request.cookies[identityCookie] || "",
    cookieName: `${prefix}torrent_csrf`,
    cookieOptions,
    getCsrfTokenFromRequest: (request) => request.get("x-csrf-token"),
    errorConfig: { statusCode: 403, message: "Invalid CSRF token.", code: "INVALID_CSRF_TOKEN" },
  });

  function rejectOrigin(response) {
    return response.status(403).json({ message: "Request origin is not allowed.", code: "INVALID_ORIGIN" });
  }

  function issueToken(request, response) {
    const origin = request.get("origin");
    if (origin && !allowedOrigins.has(origin)) return rejectOrigin(response);

    if (!/^[a-f0-9]{64}$/.test(request.cookies[identityCookie] || "")) {
      const identifier = randomBytes(32).toString("hex");
      request.cookies[identityCookie] = identifier;
      response.cookie(identityCookie, identifier, cookieOptions);
    }
    response.set("Cache-Control", "no-store");
    response.vary("Origin");
    response.vary("Cookie");
    return response.json({ csrfToken: generateCsrfToken(request, response) });
  }

  function protect(request, response, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method) || isLineWebhook(request)) return next();
    // CORS controls response access; explicitly reject untrusted or absent
    // origins before accepting a browser mutation, including Google login.
    if (!allowedOrigins.has(request.get("origin"))) return rejectOrigin(response);
    return doubleCsrfProtection(request, response, (error) => {
      if (error?.code === "INVALID_CSRF_TOKEN") {
        return response.status(403).json({ message: "Invalid CSRF token.", code: error.code });
      }
      return next(error);
    });
  }

  return { issueToken, protect };
}

module.exports = { createCsrfProtection, isLineWebhook };
