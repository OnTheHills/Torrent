const mongoose = require("mongoose");

const adminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    includeKeywords: { type: [String], default: undefined },
    excludeKeywords: { type: [String], default: undefined },
    autoThreshold: { type: Number, default: 90 },
    reviewThreshold: { type: Number, default: 80 },
  },
  { collection: "admin_settings", timestamps: true },
);

module.exports = mongoose.model("AdminSettings", adminSettingsSchema);
