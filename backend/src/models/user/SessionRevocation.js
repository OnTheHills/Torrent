const mongoose = require("mongoose");

// jti denylist for logout / forced session termination (TTL cleans expired rows).
const sessionRevocationSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: "session_revocations" },
);

sessionRevocationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("SessionRevocation", sessionRevocationSchema);
