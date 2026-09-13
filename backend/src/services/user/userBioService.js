const userBioRepository = require("@/repositories/userBioRepository");

async function createUserBio(data) {
  return userBioRepository.create(data);
}

async function getAllUserBios() {
  return userBioRepository.findAll();
}

async function getUserBioById(id) {
  return userBioRepository.findById(id);
}

async function updateUserBio(id, data) {
  return userBioRepository.update(id, data);
}

async function deleteUserBio(id) {
  return userBioRepository.remove(id);
}

module.exports = {
  createUserBio,
  deleteUserBio,
  getAllUserBios,
  getUserBioById,
  updateUserBio,
};
