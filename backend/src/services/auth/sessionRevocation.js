const mongoose = require("mongoose");
const SessionRevocation = require("@/models/user/SessionRevocation");
const { errorFields, logger } = require("@/utils/logger");

// In-memory mirror so revoke checks stay fast and work before indexes settle.
const memory = new Map();

function pruneMemory(now = Date.now()) {
  for (const [jti, expiresAt] of memory) {
    if (expiresAt <= now) memory.delete(jti);
  }
}

function mongoReady() {
  return mongoose.connection.readyState === 1;
}

async function revokeJti(jti, expiresAt) {
  if (!jti || !expiresAt) return;
  const expiryMs = expiresAt instanceof Date ? expiresAt.getTime() : Number(expiresAt);
  if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) return;

  memory.set(jti, expiryMs);
  if (!mongoReady()) return;

  try {
    await SessionRevocation.updateOne(
      { jti },
      { $set: { jti, expiresAt: new Date(expiryMs) } },
      { upsert: true },
    );
  } catch (error) {
    // Memory still holds the revoke if Mongo is temporarily unavailable.
    logger.error("session_revocation.persist_failed", errorFields(error));
  }
}

async function isRevoked(jti) {
  if (!jti) return false;
  pruneMemory();
  const cached = memory.get(jti);
  if (cached) {
    if (cached > Date.now()) return true;
    memory.delete(jti);
  }

  if (!mongoReady()) return false;

  try {
    const row = await SessionRevocation.findOne({ jti }).lean();
    if (!row) return false;
    const expiryMs = new Date(row.expiresAt).getTime();
    if (expiryMs <= Date.now()) return false;
    memory.set(jti, expiryMs);
    return true;
  } catch (error) {
    logger.error("session_revocation.lookup_failed", errorFields(error));
    return false;
  }
}

module.exports = { revokeJti, isRevoked };
