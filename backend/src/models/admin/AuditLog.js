const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorEmail: { type: String, trim: true },
    actorRole: { type: String, trim: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true, index: true },
    targetId: { type: String, index: true },
    reason: { type: String, trim: true },
    checked: { type: [String], default: undefined },
    changes: {
      type: [
        {
          field: String,
          before: mongoose.Schema.Types.Mixed,
          after: mongoose.Schema.Types.Mixed,
        },
      ],
      default: undefined,
    },
  },
  { collection: "audit_logs", timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
