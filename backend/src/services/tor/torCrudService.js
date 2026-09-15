const torRepository = require("@/repositories/torRepository");

async function createTor(data) {
  return torRepository.create(data);
}

async function getAllTors() {
  return torRepository.findAll();
}

async function getTorById(id) {
  return torRepository.findById(id);
}

async function updateTor(id, data) {
  return torRepository.update(id, data);
}

async function deleteTor(id) {
  return torRepository.remove(id);
}

module.exports = { createTor, deleteTor, getAllTors, getTorById, updateTor };
