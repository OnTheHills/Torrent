const { securityLog } = require("@/utils/securityLog");

/**
 * Simple fixed-window rate limiter (no Redis). Suitable for single-node Compose
 * and ASVS anti-automation on auth/CSRF endpoints.
 */
function createRateLimiter({
  windowMs = 60_000,
  max = 30,
  name = "limit",
  keyFn = (request) => request.ip || request.socket?.remoteAddress || "unknown",
} = {}) {
  const buckets = new Map();

  function prune(now) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  return function rateLimit(request, response, next) {
    const now = Date.now();
    if (buckets.size > 5_000) prune(now);

    const key = `${name}:${keyFn(request)}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    response.setHeader("X-RateLimit-Limit", String(max));
    response.setHeader("X-RateLimit-Remaining", String(remaining));
    response.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      response.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      securityLog(
        "rate_limited",
        { outcome: "denied", limiter: name, status: 429 },
        request,
      );
      return response.status(429).json({
        message: "Too many requests. Try again shortly.",
        code: "RATE_LIMITED",
      });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
