const userRepository = require("@/repositories/userRepository");

async function createUser(data) {
  return userRepository.create(data);
}

async function getAllUsers() {
  return userRepository.findAll();
}

async function getUserById(id) {
  return userRepository.findById(id);
}

async function updateUser(id, data, actorRole) {
  const updates = { ...data };
  if (actorRole !== "admin") {
    delete updates.role;
  }
  return userRepository.update(id, updates);
}

async function deleteUser(id) {
  return userRepository.remove(id);
}

module.exports = { createUser, deleteUser, getAllUsers, getUserById, updateUser };
