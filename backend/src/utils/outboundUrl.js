const { lookup } = require("node:dns/promises");
const { isIP } = require("node:net");

/** Host suffixes allowed for server-side PDF/document fetches (SSRF guard). */
const DEFAULT_PDF_HOST_SUFFIXES = [
  "gprocurement.go.th",
  "bangkok.go.th",
  "egp.go.th",
  "cgd.go.th",
  "mdes.go.th",
  "depa.or.th",
];

function configuredSuffixes() {
  const raw = process.env.OUTBOUND_PDF_HOST_SUFFIXES;
  if (!raw) return DEFAULT_PDF_HOST_SUFFIXES;
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isPrivateIp(address) {
  if (!address) return true;
  const value = String(address).toLowerCase();
  if (value === "::1" || value === "127.0.0.1") return true;
  if (value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:")) return true;
  if (value.startsWith("10.")) return true;
  if (value.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(value)) return true;
  if (value.startsWith("169.254.")) return true;
  if (value === "0.0.0.0") return true;
  return false;
}

function hostAllowed(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1") {
    return process.env.NODE_ENV !== "production";
  }
  return configuredSuffixes().some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/**
 * Validate an outbound HTTP(S) URL before following it (admin PDF / OCR).
 * Rejects non-http(s), disallowed hosts, and literal private IPs in the URL.
 */
function assertSafeOutboundUrl(rawUrl, { label = "URL" } = {}) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || ""));
  } catch {
    const error = new Error(`${label} is invalid.`);
    error.statusCode = 400;
    throw error;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    const error = new Error(`${label} must be http(s).`);
    error.statusCode = 400;
    throw error;
  }

  if (parsed.protocol === "http:" && process.env.NODE_ENV === "production") {
    const error = new Error(`${label} must use HTTPS in production.`);
    error.statusCode = 400;
    throw error;
  }

  if (parsed.username || parsed.password) {
    const error = new Error(`${label} must not include credentials.`);
    error.statusCode = 400;
    throw error;
  }

  if (!hostAllowed(parsed.hostname)) {
    const error = new Error(`${label} host is not allowlisted.`);
    error.statusCode = 400;
    throw error;
  }

  if (isIP(parsed.hostname) && isPrivateIp(parsed.hostname)) {
    const error = new Error(`${label} resolves to a private address.`);
    error.statusCode = 400;
    throw error;
  }

  return parsed.toString();
}

/** Optional DNS check — fails closed when the hostname resolves only to private IPs. */
async function assertSafeOutboundUrlResolved(rawUrl, options) {
  const safe = assertSafeOutboundUrl(rawUrl, options);
  const { hostname } = new URL(safe);
  if (isIP(hostname)) return safe;

  try {
    const results = await lookup(hostname, { all: true });
    if (!results.length || results.every((row) => isPrivateIp(row.address))) {
      const error = new Error("URL resolves to a private address.");
      error.statusCode = 400;
      throw error;
    }
  } catch (error) {
    if (error.statusCode) throw error;
    const failed = new Error("Could not resolve URL host.");
    failed.statusCode = 400;
    throw failed;
  }

  return safe;
}

module.exports = {
  DEFAULT_PDF_HOST_SUFFIXES,
  assertSafeOutboundUrl,
  assertSafeOutboundUrlResolved,
  hostAllowed,
  isPrivateIp,
};
