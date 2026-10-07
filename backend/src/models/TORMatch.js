const mongoose = require("mongoose");

const torMatchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    torId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TOR",
      required: true,
      index: true,
    },
    matchPercent: {
      type: mongoose.Schema.Types.Decimal128,
    },
    matchReason: {
      type: String,
      trim: true,
    },
  },
  {
    collection: "tor_matches",
    timestamps: true,
  },
);

torMatchSchema.index({ userId: 1, torId: 1 }, { unique: true });

module.exports = mongoose.model("TORMatch", torMatchSchema);
