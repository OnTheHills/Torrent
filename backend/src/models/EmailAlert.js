const mongoose = require("mongoose");

const emailAlertSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  torId: { type: mongoose.Schema.Types.ObjectId, ref: "TOR", required: true },
  kind: { type: String, enum: ["match", "deadline", "integrity"], required: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ["pending", "sending", "sent", "failed"], default: "pending" },
  retryAt: { type: Date, default: Date.now },
  leaseUntil: Date,
  attempts: { type: Number, default: 0 },
  lastError: String,
  sentAt: Date,
}, { timestamps: true });

emailAlertSchema.index({ status: 1, retryAt: 1, leaseUntil: 1 });

module.exports = mongoose.model("EmailAlert", emailAlertSchema);
