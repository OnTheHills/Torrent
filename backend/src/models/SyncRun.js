const mongoose = require("mongoose");

const syncRunSchema = new mongoose.Schema(
  {
    sourceKey: { type: String, required: true, index: true },
    trigger: { type: String, enum: ["manual", "auto", "startup"], default: "manual" },
    status: {
      type: String,
      enum: ["running", "success", "failed"],
      default: "running",
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    durationMs: { type: Number },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    triggeredByEmail: { type: String, trim: true },
    fetched: { type: Number },
    matched: { type: Number },
    createdCount: { type: Number },
    updatedCount: { type: Number },
    unchangedCount: { type: Number },
    removedCount: { type: Number },
    error: { type: String, trim: true },
    summary: { type: mongoose.Schema.Types.Mixed },
  },
  { collection: "sync_runs", timestamps: true },
);

module.exports = mongoose.model("SyncRun", syncRunSchema);
