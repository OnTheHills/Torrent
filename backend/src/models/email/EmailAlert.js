const mongoose = require("mongoose");

// Delivery state is separate; recipient and message content come from User, TOR, and TORMatch.
const emailAlertSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  torId: { type: mongoose.Schema.Types.ObjectId, ref: "TOR", required: true },
  kind: { type: String, enum: ["match", "deadline", "integrity"], required: true },
  // Pin retry identity at insertion. Legacy rows used SHA-256.
  recipientHashAlgorithm: { type: String, enum: ["sha256", "sha384", "sha512"], default: "sha256" },
  status: { type: String, enum: ["pending", "sending", "sent", "failed"], default: "pending" },
  retryAt: { type: Date, default: Date.now },
  leaseUntil: Date,
  attempts: { type: Number, default: 0 },
  lastError: String,
  sentAt: Date,
}, { timestamps: true });

emailAlertSchema.index({ status: 1, retryAt: 1, leaseUntil: 1 });

module.exports = mongoose.model("EmailAlert", emailAlertSchema);
