/** Baseline browser/API security headers for the Express host. */
function securityHeaders(_request, response, next) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  );
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return next();
}

module.exports = { securityHeaders };
