const TORMatch = require("@/models/tor/TORMatch");
const TorMatchJob = require("@/models/tor/TorMatchJob");

async function create(data) {
  return TORMatch.create(data);
}

async function findAll() {
  return TORMatch.find();
}

async function findPendingTorIds() {
  const jobs = await TorMatchJob.find({
    status: { $in: ["pending", "running", "waiting"] },
  })
    .select("torId")
    .lean();
  return jobs.map((job) => String(job.torId));
}

async function findByUserId(userId) {
  return TORMatch.find({ userId }).sort({ updatedAt: -1 });
}

async function findActiveEmailMatchesByUserId(userId) {
  return TORMatch.find({ userId, dismissedAt: null, badResultAt: null })
    .select("_id torId matchPercent matchReason createdAt").lean();
}

async function findActiveEmailMatch(userId, torId) {
  return TORMatch.findOne({ userId, torId, dismissedAt: null, badResultAt: null }).lean();
}

async function findById(id) {
  return TORMatch.findById(id);
}

async function setDismissedForUser(id, userId, dismissed) {
  return TORMatch.findOneAndUpdate(
    { _id: id, userId },
    { $set: { dismissedAt: dismissed ? new Date() : null } },
    { returnDocument: "after" },
  );
}

async function setBadResultForUser(id, userId) {
  const now = new Date();
  return TORMatch.findOneAndUpdate(
    { _id: id, userId },
    { $set: { badResultAt: now, dismissedAt: now } },
    { returnDocument: "after" },
  );
}

async function update(id, data) {
  return TORMatch.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });
}

async function remove(id) {
  return TORMatch.findByIdAndDelete(id);
}

module.exports = {
  create,
  findAll,
  findById,
  findByUserId,
  findActiveEmailMatchesByUserId,
  findActiveEmailMatch,
  findPendingTorIds,
  setDismissedForUser,
  setBadResultForUser,
  remove,
  update,
};
