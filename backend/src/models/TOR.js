const mongoose = require("mongoose");

// Normalized storage contract shared by every procurement source. Source adapters
// translate their API-specific payloads into this schema before an upsert.
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
    deadline: {
      type: Date,
    },
    budgetThb: {
      type: Number,
    },
    priceBuildThb: {
      type: Number,
    },
    budgetYear: {
      type: String,
      trim: true,
    },
    agencyId: {
      type: String,
      trim: true,
    },
    egpDeptId: {
      type: String,
      trim: true,
    },
    egpDeptSubId: {
      type: String,
      trim: true,
    },
    documentUrl: {
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
    hidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    hiddenReason: {
      type: String,
      trim: true,
    },
    confidence: {
      type: Number,
    },
    reviewStatus: {
      type: String,
      enum: ["auto", "review", "manual", "approved", "rejected"],
      index: true,
    },
    reviewMissing: {
      type: [String],
      default: undefined,
    },
    reviewScoreSource: {
      type: String,
      enum: ["heuristic", "vertex"],
    },
    reviewScoreReason: {
      type: String,
      trim: true,
    },
    reviewScoredAt: {
      type: Date,
    },
    reviewNote: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    integrityStatus: {
      type: String,
      enum: ["clear", "flagged", "confirmed", "dismissed"],
      default: "clear",
      index: true,
    },
    integrityFlags: {
      type: [String],
      default: [],
    },
    integrityReason: {
      type: String,
      trim: true,
    },
    integrityNote: {
      type: String,
      trim: true,
    },
    ocr: {
      status: {
        type: String,
        trim: true,
      },
      source: {
        type: String,
        trim: true,
      },
      method: {
        type: String,
        trim: true,
      },
      fileName: {
        type: String,
        trim: true,
      },
      fileUrl: {
        type: String,
        trim: true,
      },
      model: {
        type: String,
        trim: true,
      },
      summaryVersion: {
        type: Number,
      },
      extractedAt: {
        type: Date,
      },
      error: {
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
      requirements: {
        type: [String],
        default: undefined,
      },
      deadline: {
        type: Date,
      },
      skills: {
        type: [String],
        default: undefined,
      },
    },
  },
  {
    collection: "tors",
    timestamps: true,
  },
);

module.exports = mongoose.model("TOR", torSchema);
