const mongoose = require("mongoose");

const torSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    torPdfPath: {
      type: String,
      trim: true,
    },
    skillNeededList: {
      type: [String],
      default: undefined,
    },
    status: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    collection: "tors",
    timestamps: true,
  },
);

module.exports = mongoose.model("TOR", torSchema);
