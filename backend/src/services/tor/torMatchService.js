const TOR = require("@/models/TOR");
const { fitScoreApplies } = require("@/jobs/matchTors");
const torMatchRepository = require("@/repositories/torMatchRepository");

async function createTorMatch(data) {
  return torMatchRepository.create(data);
}

async function getAllTorMatches() {
  return torMatchRepository.findAll();
}

async function getPendingTorIds() {
  return torMatchRepository.findPendingTorIds();
}

async function getTorMatchesByUserId(userId) {
  const matches = await torMatchRepository.findByUserId(userId);
  if (!matches.length) return matches;

  const tors = await TOR.find({ _id: { $in: matches.map((match) => match.torId) } })
    .select("_id status deadline ocr.deadline")
    .lean();
  const byId = new Map(tors.map((tor) => [String(tor._id), tor]));
  const kept = [];
  const dropIds = [];

  for (const match of matches) {
    if (fitScoreApplies(byId.get(String(match.torId)))) kept.push(match);
    else dropIds.push(match._id);
  }

  if (dropIds.length) {
    await Promise.all(dropIds.map((id) => torMatchRepository.remove(id)));
  }

  return kept;
}

async function getTorMatchById(id) {
  return torMatchRepository.findById(id);
}

async function updateTorMatch(id, data) {
  return torMatchRepository.update(id, data);
}

async function setMyMatchDismissed(id, userId, dismissed) {
  return torMatchRepository.setDismissedForUser(id, userId, dismissed);
}

async function deleteTorMatch(id) {
  return torMatchRepository.remove(id);
}

module.exports = {
  createTorMatch,
  deleteTorMatch,
  getAllTorMatches,
  getPendingTorIds,
  getTorMatchesByUserId,
  setMyMatchDismissed,
  getTorMatchById,
  updateTorMatch,
};
