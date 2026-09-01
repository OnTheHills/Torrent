const mongoose = require("mongoose");

const vendorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    companyEmail: {
      type: String,
      trim: true,
      
    },
    vendorCapDescription: {
      type: String,
      trim: true,
    },
    techSkills: {
      type: [String],
      default: undefined,
    },
    pastProjects: {
      type: [String],
      default: undefined,
    },
    website: {
      type: String,
      trim: true,
    },
    companyPhone: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
  },
  {
    collection: "vendor_profiles",
    timestamps: true,
  },
);

module.exports = mongoose.model("VendorProfile", vendorProfileSchema);
