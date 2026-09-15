const torMatchRepository = require("@/repositories/torMatchRepository");

async function createTorMatch(data) {
  return torMatchRepository.create(data);
}

async function getAllTorMatches() {
  return torMatchRepository.findAll();
}

async function getTorMatchById(id) {
  return torMatchRepository.findById(id);
}

async function updateTorMatch(id, data) {
  return torMatchRepository.update(id, data);
}

async function deleteTorMatch(id) {
  return torMatchRepository.remove(id);
}

module.exports = {
  createTorMatch,
  deleteTorMatch,
  getAllTorMatches,
  getTorMatchById,
  updateTorMatch,
};
