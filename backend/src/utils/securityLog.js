/**
 * Structured security-event logging (stdout JSON). Never log secrets, tokens,
 * or raw credentials — only outcomes and coarse request metadata.
 */
function clientIp(request) {
  if (!request) return undefined;
  return request.ip || request.socket?.remoteAddress || undefined;
}

function securityLog(event, fields = {}, request) {
  const entry = {
    type: "security",
    event,
    at: new Date().toISOString(),
    ...fields,
  };
  if (request) {
    entry.method = request.method;
    entry.path = request.path || request.url;
    entry.ip = clientIp(request);
    if (request.user?.sub) entry.actorId = request.user.sub;
    if (request.user?.email) entry.actorEmail = request.user.email;
    if (request.user?.role) entry.actorRole = request.user.role;
  }
  console.info(JSON.stringify(entry));
}

module.exports = { securityLog, clientIp };
