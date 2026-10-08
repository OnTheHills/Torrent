const { isDeepStrictEqual } = require("node:util");
const torRepository = require("@/repositories/torRepository");
const torMatching = require("@/jobs/matchTors");

async function createTor(data) {
  const tor = await torRepository.create(data);
  await torMatching.enqueueTor(tor._id);
  return tor;
}

async function getAllTors() {
  return torRepository.findAll();
}

async function getTorById(id) {
  return torRepository.findById(id);
}

async function updateTor(id, data = {}) {
  const previous = await torRepository.findById(id);
  if (!previous) return null;
  const tor = await torRepository.update(id, data);
  const before = previous.toObject();
  const after = tor?.toObject();
  if (after && Object.keys(data).some((field) => !isDeepStrictEqual(before[field], after[field]))) {
    await torMatching.enqueueTor(tor._id);
  }
  return tor;
}

async function deleteTor(id) {
  return torRepository.remove(id);
}

module.exports = { createTor, deleteTor, getAllTors, getTorById, updateTor };
