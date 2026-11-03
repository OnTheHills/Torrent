const vendorProfileRepository = require("@/repositories/vendorProfileRepository");
const TORMatch = require("@/models/TORMatch");
const { saveCertificates } = require("./certificateStorage");

async function createVendorProfile(data, files) {
  return saveCertificates({ data, files, userId: data.userId, persist: vendorProfileRepository.create });
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

async function updateVendorProfile(id, data, files, existing) {
  existing ||= await vendorProfileRepository.findById(id);
  if (!existing) return null;
  return saveCertificates({
    data, files, existing, userId: existing.userId,
    persist: (values) => vendorProfileRepository.update(id, values),
  });
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
