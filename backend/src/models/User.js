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
    picture: { type: String, trim: true },
    emailVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("User", userSchema);
