/** Baseline browser/API security headers for the Express host. */
function securityHeaders(request, response, next) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  );
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // API JSON must not be framed or treated as a cross-origin embeddable resource.
  response.setHeader("Cross-Origin-Resource-Policy", "same-site");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");

  // Block top-level browser navigations to API JSON (ASVS V3.2.1).
  const dest = request.get("sec-fetch-dest");
  const mode = request.get("sec-fetch-mode");
  if (
    /^\/api(?:\/|$)/i.test(request.path) &&
    dest === "document" &&
    mode === "navigate"
  ) {
    return response.status(404).json({ message: "Not found." });
  }

  return next();
}

module.exports = { securityHeaders };
