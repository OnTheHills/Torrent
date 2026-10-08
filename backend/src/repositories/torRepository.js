const TOR = require("@/models/TOR");
const TORMatch = require("@/models/TORMatch");
const TorMatchJob = require("@/models/TorMatchJob");
const { isDeepStrictEqual } = require("node:util");

async function create(data) {
  return TOR.create(data);
}

async function findAll() {
  return TOR.find().sort({ publishedAt: -1 });
}

async function findById(id) {
  return TOR.findById(id);
}

async function update(id, data) {
  return TOR.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });
}

async function remove(id) {
  const tor = await TOR.findByIdAndDelete(id);
  if (tor) {
    await Promise.all([
      TORMatch.deleteMany({ torId: tor._id }),
      TorMatchJob.deleteOne({ torId: tor._id }),
    ]);
  }
  return tor;
}

function key({ refId, source }) {
  // These two upstream fields identify one TOR across repeated pulls.
  return `${source}:${refId}`;
}

async function saveChanged(tors) {
  const summary = { created: 0, updated: 0, unchanged: 0, changedTorIds: [] };
  // Ignore duplicate results from overlapping source searches before touching MongoDB.
  const uniqueTors = [...new Map(tors.map((tor) => [key(tor), tor])).values()];
  if (!uniqueTors.length) return summary;

  // Load the batch once, then decide in memory which records need a write.
  const existing = await TOR.find({
    refId: { $in: uniqueTors.map((tor) => tor.refId) },
    source: { $in: uniqueTors.map((tor) => tor.source) },
  }).lean();
  const byKey = new Map(existing.map((tor) => [key(tor), tor]));
  const writes = [];
  const changedPairs = [];

  for (const tor of uniqueTors) {
    const current = byKey.get(key(tor));
    if (!current) {
      // No existing source/refId pair: this is a newly discovered TOR.
      summary.created++;
      writes.push({ insertOne: { document: tor } });
      changedPairs.push({ source: tor.source, refId: tor.refId });
    } else if (Object.keys(tor).some((field) => !isDeepStrictEqual(current[field], tor[field]))) {
      // Same TOR changed at its source: update the stored record in place.
      summary.updated++;
      writes.push({ updateOne: { filter: { _id: current._id }, update: { $set: tor } } });
      changedPairs.push({ source: tor.source, refId: tor.refId });
    } else {
      // Identical source data: do not issue a redundant database write.
      summary.unchanged++;
    }
  }

  // Send only inserts and updates; unchanged TORs are deliberately absent.
  if (writes.length) await TOR.bulkWrite(writes);
  if (changedPairs.length) {
    const changed = await TOR.find({ $or: changedPairs }).select("_id").lean();
    summary.changedTorIds = changed.map((tor) => tor._id);
  }
  return summary;
}

async function findBySource(source) {
  return TOR.find({ source }).select("refId source ocr egpUrl budgetThb torPdfPath").lean();
}

async function saveOcr(refId, source, ocr) {
  return TOR.findOneAndUpdate(
    { refId, source },
    { $set: { ocr } },
    { returnDocument: "after" },
  );
}

async function deleteMissingFromSource(source, keepRefIds) {
  const missing = await TOR.find({ source, refId: { $nin: keepRefIds } }).select("_id").lean();
  const result = await TOR.deleteMany({
    source,
    refId: { $nin: keepRefIds },
  });
  if (missing.length) {
    const torIds = missing.map((tor) => tor._id);
    await Promise.all([
      TORMatch.deleteMany({ torId: { $in: torIds } }),
      TorMatchJob.deleteMany({ torId: { $in: torIds } }),
    ]);
  }
  return { removed: result.deletedCount || 0 };
}

module.exports = {
  create,
  deleteMissingFromSource,
  findAll,
  findById,
  findBySource,
  remove,
  saveChanged,
  saveOcr,
  update,
};
