const User = require("@/models/user/User");

async function create(data) {
  return User.create(data);
}

async function findAll() {
  return User.find();
}

async function findByEmail(email) {
  return User.findOne({ email });
}

async function findByGoogleId(googleId) {
  return User.findOne({ googleId });
}

async function findById(id) {
  return User.findById(id);
}

async function findPublicById(id) {
  return User.findById(id).select("-passwordHash");
}

async function findAuthById(id) {
  return User.findById(id).select("_id role email disabled sessionVersion").lean();
}

async function findEmailAlertPrefsById(id) {
  return User.findById(id).select("emailAlertPrefs").lean();
}

async function updateEmailAlertPrefsById(id, prefs) {
  return User.findByIdAndUpdate(id, { emailAlertPrefs: prefs }, { returnDocument: "after" })
    .select("emailAlertPrefs").lean();
}

async function findUsersEligibleForEmailAlerts() {
  return User.find({
    role: { $in: ["vendor", "admin"] }, disabled: { $ne: true }, emailVerified: true,
    "emailAlertPrefs.savedAt": { $exists: true },
  }).select("_id email emailAlertPrefs").lean();
}

async function findEmailDeliveryUserById(id) {
  return User.findById(id).select("email emailVerified disabled emailAlertPrefs").lean();
}

async function save(user) {
  return user.save();
}

async function findWatchlist(id) {
  return User.findById(id).select("+watchlist").lean();
}

async function setWatchlistTor(id, torId, saved) {
  // Atomic, idempotent updates avoid duplicate saves and concurrent-tab losses.
  return User.findByIdAndUpdate(id,
    saved ? { $addToSet: { watchlist: torId } } : { $pull: { watchlist: torId } },
    { returnDocument: "after", runValidators: true },
  ).select("+watchlist").lean();
}

async function update(id, data) {
  return User.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });
}

async function remove(id) {
  return User.findByIdAndDelete(id);
}

module.exports = {
  findWatchlist,
  setWatchlistTor,
  create,
  findAll,
  findByEmail,
  findByGoogleId,
  findById,
  findAuthById,
  findEmailAlertPrefsById,
  findEmailDeliveryUserById,
  findPublicById,
  findUsersEligibleForEmailAlerts,
  remove,
  save,
  update,
  updateEmailAlertPrefsById,
};
