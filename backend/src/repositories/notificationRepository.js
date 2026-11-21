const Notification = require("@/models/Notification");

async function createIfAbsent(notification) {
  try {
    const result = await Notification.updateOne(
      { key: notification.key },
      { $setOnInsert: notification },
      { upsert: true },
    );
    return result?.upsertedCount || 0;
  } catch (error) {
    if (error.code === 11000) return 0;
    throw error;
  }
}

async function findMine(userId) {
  return Notification.find({ userId, dismissed: false }).sort({ createdAt: -1 }).lean();
}

async function updateMine(id, userId, fields) {
  return Notification.findOneAndUpdate(
    { _id: id, userId },
    { $set: fields },
    { returnDocument: "after", runValidators: true },
  ).lean();
}

async function markAllRead(userId) {
  return Notification.updateMany({ userId, dismissed: false, read: false }, { $set: { read: true } });
}

module.exports = { createIfAbsent, findMine, markAllRead, updateMine };
