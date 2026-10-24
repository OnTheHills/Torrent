const AuditLog = require("@/models/AuditLog");

function actorFrom(user) {
  if (!user) return {};
  return {
    actorId: user.sub || user._id,
    actorEmail: user.email,
    actorRole: user.role,
  };
}

async function record(user, entry) {
  return AuditLog.create({
    ...actorFrom(user),
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ? String(entry.targetId) : undefined,
    reason: entry.reason,
    changes: entry.changes?.length ? entry.changes : undefined,
    checked: entry.checked?.length ? entry.checked : undefined,
  });
}

function requireReason(value) {
  const reason = String(value || "").trim();
  if (reason.length < 3) {
    const error = new Error("A reason of at least 3 characters is required.");
    error.statusCode = 400;
    throw error;
  }
  return reason;
}

module.exports = { record, requireReason };
