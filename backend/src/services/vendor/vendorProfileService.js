const vendorProfileRepository = require("@/repositories/vendorProfileRepository");
const TORMatch = require("@/models/TORMatch");
const torMatching = require("@/jobs/matchTors");
const { saveCertificates } = require("./certificateStorage");

async function queueMatching() {
  try {
    await torMatching.enqueueEligibleTors();
  } catch (error) {
    // The profile and files have already committed; do not report a failed save.
    console.error("Unable to queue matching after profile save:", error.message);
  }
}

async function createVendorProfile(data, files) {
  const profile = await saveCertificates({ data, files, userId: data.userId, persist: vendorProfileRepository.create });
  await queueMatching();
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

async function updateVendorProfile(id, data, files, existing) {
  existing ||= await vendorProfileRepository.findById(id);
  if (!existing) return null;
  const profile = await saveCertificates({
    data, files, existing, userId: existing.userId,
    persist: (values) => vendorProfileRepository.update(id, values),
  });
  await queueMatching();
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
