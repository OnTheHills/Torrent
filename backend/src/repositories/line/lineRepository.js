const User = require("@/models/user/User");

const STATUS_FIELDS = "lineUserId lineDigestEnabled lineLinkedAt lineLinkCode lineLinkCodeExpiresAt";

function findStatusByUserId(userId) {
  return User.findById(userId).select(STATUS_FIELDS).lean();
}

function setLinkCode(userId, code, expiresAt) {
  return User.findByIdAndUpdate(
    userId,
    { lineLinkCode: code, lineLinkCodeExpiresAt: expiresAt },
    { returnDocument: "after" },
  ).select(STATUS_FIELDS);
}

function unlinkUser(userId) {
  return User.findByIdAndUpdate(
    userId,
    {
      $unset: { lineUserId: 1, lineLinkCode: 1, lineLinkCodeExpiresAt: 1 },
      lineDigestEnabled: false,
      lineLinkedAt: null,
    },
    { returnDocument: "after" },
  ).select(STATUS_FIELDS);
}

function findLineIdByUserId(userId) {
  return User.findById(userId).select("lineUserId");
}

function setDigestEnabled(userId, enabled) {
  return User.findByIdAndUpdate(
    userId,
    { lineDigestEnabled: enabled },
    { returnDocument: "after" },
  ).select(STATUS_FIELDS);
}

function findByLineUserId(lineUserId) {
  return User.findOne({ lineUserId }).select("lineDigestEnabled").lean();
}

function findLinkedLineUserId(lineUserId) {
  return User.findOne({ lineUserId }).select("_id").lean();
}

function clearLineUserId(lineUserId) {
  return User.updateOne(
    { lineUserId },
    {
      $unset: { lineUserId: 1, lineLinkCode: 1, lineLinkCodeExpiresAt: 1 },
      lineDigestEnabled: false,
      lineLinkedAt: null,
    },
  );
}

function findByValidLinkCode(code, now) {
  return User.findOne({ lineLinkCode: code, lineLinkCodeExpiresAt: { $gt: now } });
}

function clearOtherLineLinks(lineUserId, userId) {
  return User.updateMany(
    { lineUserId, _id: { $ne: userId } },
    { $unset: { lineUserId: 1 }, lineDigestEnabled: false, lineLinkedAt: null },
  );
}

function save(user) {
  return user.save();
}

function findDigestRecipients(limit) {
  return User.find({
    lineDigestEnabled: true,
    lineUserId: { $ne: null },
    disabled: { $ne: true },
    role: { $in: ["vendor", "admin"] },
  }).select("lineUserId email").limit(limit).lean();
}

module.exports = {
  findStatusByUserId,
  setLinkCode,
  unlinkUser,
  findLineIdByUserId,
  setDigestEnabled,
  findByLineUserId,
  findLinkedLineUserId,
  clearLineUserId,
  findByValidLinkCode,
  clearOtherLineLinks,
  save,
  findDigestRecipients,
};
