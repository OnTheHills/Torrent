const TOR = require("@/models/tor/TOR");
const TORMatch = require("@/models/tor/TORMatch");
const TorMatchJob = require("@/models/tor/TorMatchJob");
const { isDeepStrictEqual } = require("node:util");

async function create(data) {
  return TOR.create(data);
}

/** Fields the public catalog list does not need (keeps /tors payloads small). */
const LIST_EXCLUDE = {
  description: 0,
  requirements: 0,
  sources: 0,
  mergeConflicts: 0,
  reviewNote: 0,
  reviewScoreReason: 0,
  integrityNote: 0,
  integrityNoteEn: 0,
  "ocr.requirements": 0,
  "ocr.requirementsEn": 0,
  "ocr.requirementItems": 0,
  "ocr.summary": 0,
  "ocr.summaryTh": 0,
  "ocr.error": 0,
};

async function findAll() {
  // Public catalog: every non-hidden software TOR from all active feeds.
  // lean + projection — full OCR text / merge history only load on detail.
  return TOR.find({ hidden: { $ne: true } })
    .select(LIST_EXCLUDE)
    .sort({ publishedAt: -1 })
    .lean();
}

/** Budgets for one category — enough for detail-page medians without the full catalog. */
async function findBudgetPeers(category) {
  if (!category) return [];
  return TOR.find(
    {
      hidden: { $ne: true },
      category,
      budgetThb: { $gt: 0 },
    },
    { budgetThb: 1, category: 1 },
  ).lean();
}

async function findById(id) {
  return TOR.findById(id).lean();
}

async function findEmailAlertTorsByIds(ids) {
  return TOR.find({ _id: { $in: ids } })
    .select("_id title titleTh description summary summaryTh department departmentTh hidden status source category budgetThb ocr.budgetThb ocr.summary ocr.summaryTh deadline ocr.deadline integrityStatus updatedAt")
    .lean();
}

async function findNewTorsSince(since) {
  return TOR.find({
    hidden: { $ne: true },
    $or: [{ publishedAt: { $gte: since } }, { createdAt: { $gte: since } }],
  })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(10)
    .select("title titleTh refId _id publishedAt createdAt")
    .lean();
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
  const summary = {
    created: 0,
    updated: 0,
    unchanged: 0,
    changedTorIds: [],
    createdTorIds: [],
  };
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
  const createdPairs = [];

  for (const tor of uniqueTors) {
    const current = byKey.get(key(tor));
    if (!current) {
      // No existing source/refId pair: this is a newly discovered TOR.
      summary.created++;
      writes.push({ insertOne: { document: tor } });
      changedPairs.push({ source: tor.source, refId: tor.refId });
      createdPairs.push({ source: tor.source, refId: tor.refId });
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
  if (createdPairs.length) {
    const created = await TOR.find({ $or: createdPairs }).select("_id").lean();
    summary.createdTorIds = created.map((tor) => tor._id);
  }
  return summary;
}

async function findBySource(source) {
  return TOR.find({ source })
    .select("refId source status ocr egpUrl documentUrl budgetThb torPdfPath")
    .lean();
}

async function findEgpDeptIds(source) {
  return TOR.distinct("egpDeptId", { source, egpDeptId: { $ne: null } });
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
  findBudgetPeers,
  findById,
  findEmailAlertTorsByIds,
  findNewTorsSince,
  findBySource,
  findEgpDeptIds,
  remove,
  saveChanged,
  saveOcr,
  update,
};
