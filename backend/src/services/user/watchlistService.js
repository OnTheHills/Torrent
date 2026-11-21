const users = require("@/repositories/user/userRepository");
const tors = require("@/repositories/tor/torRepository");
const { requireObjectId } = require("@/utils/validate");

function present(user) {
  if (!user) throw Object.assign(new Error("User not found."), { statusCode: 404 });
  return { savedIds: (user.watchlist || []).map(String) };
}

async function getWatchlist(userId) {
  return present(await users.findWatchlist(userId));
}

async function setSaved(userId, torId, saved) {
  requireObjectId(torId, "TOR");
  if (saved) {
    const tor = await tors.findById(torId);
    if (!tor || tor.hidden) throw Object.assign(new Error("TOR not found."), { statusCode: 404 });
  }
  // Removing an old/deleted TOR is always possible for its owner.
  return present(await users.setWatchlistTor(userId, torId, saved));
}

module.exports = { getWatchlist, setSaved };
