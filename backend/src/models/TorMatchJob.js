const mongoose = require("mongoose");

const torMatchJobSchema = new mongoose.Schema(
  {
    torId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TOR",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "running", "waiting", "complete"],
      default: "pending",
      index: true,
    },
    cursor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    generation: { type: Number, default: 1 },
    retryCount: { type: Number, default: 0 },
    retryAt: { type: Date },
    leaseUntil: { type: Date },
    lockId: { type: String },
    lastError: { type: String },
    completedAt: { type: Date },
  },
  // Keep TOR jobs separate from the earlier per-vendor job format.
  { collection: "tor_match_jobs_by_tor", timestamps: true },
);

module.exports = mongoose.model("TorMatchJob", torMatchJobSchema);
