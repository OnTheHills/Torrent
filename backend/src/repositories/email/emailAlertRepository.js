const EmailAlert = require("@/models/email/EmailAlert");

async function queue(alert) {
  try {
    const result = await EmailAlert.updateOne(
      { key: alert.key },
      { $setOnInsert: alert },
      { upsert: true },
    );
    return result?.upsertedCount || 0;
  } catch (error) {
    if (error.code === 11000) return 0;
    throw error;
  }
}

async function claimNext(now, leaseUntil) {
  return EmailAlert.findOneAndUpdate(
    { $or: [
      { status: "pending", retryAt: { $lte: now } },
      { status: "sending", leaseUntil: { $lte: now } },
    ] },
    { $set: { status: "sending", leaseUntil }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  ).lean();
}

async function updateSending(id, fields) {
  return EmailAlert.updateOne(
    { _id: id, status: "sending" },
    { $set: { ...fields, leaseUntil: null } },
  );
}

module.exports = { queue, claimNext, updateSending };
