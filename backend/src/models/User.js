const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    username: {
      type: String,
      trim: true,
    },
    firstname: {
      type: String,
      trim: true,
    },
    lastname: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
    },
    role: {
      type: String,
      enum: ["public", "vendor", "admin"],
      default: "public",
    },
    provider: {
      type: String,
      enum: ["google", "password"],
      default: "google",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    lineUserId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    lineDigestEnabled: {
      type: Boolean,
      default: false,
    },
    lineLinkedAt: {
      type: Date,
      default: null,
    },
    lineLinkCode: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
      sparse: true,
    },
    lineLinkCodeExpiresAt: {
      type: Date,
      default: null,
    },
    picture: { type: String, trim: true },
    emailVerified: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ lineDigestEnabled: 1, lineUserId: 1 });

module.exports = mongoose.model("User", userSchema);
