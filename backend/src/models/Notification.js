const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  torId: { type: mongoose.Schema.Types.ObjectId, ref: "TOR", required: true },
  kind: { type: String, enum: ["match", "risk", "deadline"], required: true },
  body: { type: String, required: true },
  bodyTh: { type: String, required: true },
  read: { type: Boolean, default: false },
  dismissed: { type: Boolean, default: false },
}, { collection: "notifications", timestamps: true });

notificationSchema.index({ userId:  1, dismissed: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
