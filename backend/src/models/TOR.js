const mongoose = require("mongoose");

const torSchema = new mongoose.Schema(
  {
    refId: {
      type: String,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleTh: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    summaryTh: {
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
    budgetThb: {
      type: Number,
    },
    agencyId: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    departmentTh: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    egpUrl: {
      type: String,
      trim: true,
    },
  },
  {
    collection: "tors",
    timestamps: true,
  },
);

module.exports = mongoose.model("TOR", torSchema);
