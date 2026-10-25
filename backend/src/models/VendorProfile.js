const mongoose = require("mongoose");

function normalizePastProjects(projects) {
  return Array.isArray(projects)
    ? projects.map((project) => typeof project === "string" ? { name: project } : project)
    : projects;
}

const pastProjectSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true },
  description: { type: String, trim: true, default: "" },
  budget: { type: Number, min: 0, default: null },
  isGovernment: { type: Boolean, default: null },
  completedAt: { type: Date, default: null },
  urls: { type: [String], default: undefined },
}, { _id: false });

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
    teamSize: {
      type:String,
      trim:true,
    },
    techSkills: {
      type: [String],
      default: undefined,
    },
    pastProjects: {
      type: [pastProjectSchema],
      default: undefined,
      set: normalizePastProjects,
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
    certificates: {
      type: [
        {
          name: { type: String, trim: true },
          issuer: { type: String, trim: true },
          status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
          },
          note: { type: String, trim: true },
        },
      ],
      default: undefined,
    },
  },
  {
    collection: "vendor_profiles",
    timestamps: true,
  },
);

// Preserve old string entries when reading profiles; saving writes structured records.
vendorProfileSchema.pre("init", function (data) {
  if (data.pastProjects) data.pastProjects = normalizePastProjects(data.pastProjects);
});

module.exports = mongoose.model("VendorProfile", vendorProfileSchema);
