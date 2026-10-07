const vendorProfileRepository = require("@/repositories/vendorProfileRepository");
const TORMatch = require("@/models/TORMatch");

async function createVendorProfile(data) {
  return vendorProfileRepository.create(data);
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
  return vendorProfileRepository.update(id, data);
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
