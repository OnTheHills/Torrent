const vendorProfileRepository = require("@/repositories/vendorProfileRepository");
const TORMatch = require("@/models/TORMatch");
const torMatching = require("@/jobs/matchTors");

async function createVendorProfile(data) {
  const profile = await vendorProfileRepository.create(data);
  await torMatching.enqueueEligibleTors();
  return profile;
}

async function getAllVendorProfiles() {
  return vendorProfileRepository.findAll();
}

async function getVendorProfileById(id) {
  return vendorProfileRepository.findById(id);
}

async function getVendorProfileByUserId(userId) {
  return vendorProfileRepository.findByUserId(userId);
}

async function updateVendorProfile(id, data) {
  const profile = await vendorProfileRepository.update(id, data);
  if (profile) await torMatching.enqueueEligibleTors();
  return profile;
}

async function deleteVendorProfile(id) {
  const profile = await vendorProfileRepository.remove(id);
  if (profile) {
    await TORMatch.deleteMany({ userId: profile.userId });
  }
  return profile;
}

module.exports = {
  createVendorProfile,
  deleteVendorProfile,
  getAllVendorProfiles,
  getVendorProfileById,
  getVendorProfileByUserId,
  updateVendorProfile,
};
