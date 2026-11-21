const ALLOWED_METHODS = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);

/**
 * Reject TRACE and other unexpected methods (ASVS V13.4.4).
 * Reject ambiguous Content-Length + Transfer-Encoding (ASVS V4.2 smuggling).
 */
function httpGuards(request, response, next) {
  const method = String(request.method || "").toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    response.setHeader("Allow", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
    return response.status(405).json({ message: "Method not allowed." });
  }

  const transferEncoding = request.headers["transfer-encoding"];
  const contentLength = request.headers["content-length"];
  if (transferEncoding && contentLength !== undefined) {
    return response.status(400).json({ message: "Malformed request." });
  }

  return next();
}

module.exports = { httpGuards, ALLOWED_METHODS };
