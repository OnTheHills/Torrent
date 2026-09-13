const vendorProfileRepository = require("@/repositories/vendorProfileRepository");

async function createVendorProfile(data) {
  return vendorProfileRepository.create(data);
}

async function getAllVendorProfiles() {
  return vendorProfileRepository.findAll();
}

async function getVendorProfileById(id) {
  return vendorProfileRepository.findById(id);
}

async function updateVendorProfile(id, data) {
  return vendorProfileRepository.update(id, data);
}

async function deleteVendorProfile(id) {
  return vendorProfileRepository.remove(id);
}

module.exports = {
  createVendorProfile,
  deleteVendorProfile,
  getAllVendorProfiles,
  getVendorProfileById,
  updateVendorProfile,
};
