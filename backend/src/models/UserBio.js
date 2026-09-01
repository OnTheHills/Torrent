const mongoose = require("mongoose");

const userBioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    userPhone: {
      type: String,
      trim: true,
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
  },
  {
    collection: "user_bios",
  },
);

module.exports = mongoose.model("UserBio", userBioSchema);
