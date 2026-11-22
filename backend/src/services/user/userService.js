const userRepository = require("@/repositories/user/userRepository");
const vendorProfileService = require("@/services/vendor/vendorProfileService");

async function getAllUsers() {
  return userRepository.findAll();
}

async function getUserById(id) {
  return userRepository.findById(id);
}

async function updateUser(id, data, actorRole) {
  if (Object.keys(data).some((key) => key === "watchlist" || key.startsWith("watchlist.") || key.startsWith("$"))) {
    throw Object.assign(new Error("Use your own watchlist endpoint."), { statusCode: 403 });
  }
  const updates = { ...data };
  if (actorRole !== "admin") {
    delete updates.role;
  }
  return userRepository.update(id, updates);
}

async function deleteUser(id) {
  const profile = await vendorProfileService.getVendorProfileByUserId(id);
  if (profile) await vendorProfileService.deleteVendorProfile(profile._id);
  return userRepository.remove(id);
}

module.exports = { deleteUser, getAllUsers, getUserById, updateUser };
