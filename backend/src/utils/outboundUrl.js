const {
  validateTorUrl,
  resolveTorDestination,
  isPublicAddress,
  isAllowedTorHost,
} = require("@/utils/torFetch");

// Compatibility entry points for the incoming security branch. Both entry
// points use the same exact-host, HTTPS/443 and path policy as TOR downloads.
function hostAllowed(hostname) {
  return isAllowedTorHost(hostname);
}

function isPrivateIp(address) {
  return !isPublicAddress(address);
}

function assertSafeOutboundUrl(rawUrl, { source = "all" } = {}) {
  return validateTorUrl(rawUrl, source).href;
}

// This performs DNS validation only. Actual downloads must use fetchTorUrl or
// resolveTorDestination + curlDestinationArgs to pin the validated connection.
async function assertSafeOutboundUrlResolved(rawUrl, { source = "all" } = {}) {
  return (await resolveTorDestination(rawUrl, source)).url.href;
}

module.exports = {
  assertSafeOutboundUrl,
  assertSafeOutboundUrlResolved,
  hostAllowed,
  isPrivateIp,
};
