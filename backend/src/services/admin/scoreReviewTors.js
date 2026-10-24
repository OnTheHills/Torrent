const TOR = require("@/models/TOR");
const classification = require("@/services/admin/classification");
const {
  confidenceOf,
  integrityReasons,
  isReviewEligible,
  resolveIntegrityFields,
  reviewBand,
} = require("@/services/admin/scoring");
const { isConfigured: vertexConfigured } = require("@/services/ai/vertexClient");
const { scoreWithVertex } = require("@/services/tor/scoreWithVertex");

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) || 0 }, () => run());
  await Promise.all(workers);
  return results;
}

async function categoryMedians() {
  const rows = await TOR.aggregate([
    {
      $match: {
        hidden: { $ne: true },
        budgetThb: { $gt: 0 },
        category: { $nin: [null, "", "Others"] },
      },
    },
    { $group: { _id: "$category", values: { $push: "$budgetThb" } } },
  ]);
  const medians = new Map();
  for (const row of rows) {
    const values = row.values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    medians.set(row._id, { median, count: values.length });
  }
  return medians;
}

/**
 * Heuristic-score TOR ids, then Vertex-score open Lookup/Must-check rows.
 * Also writes Watch out integrity from rules (+ Vertex when scored).
 * Used after sync for newly created software TORs.
 */
async function scoreTorIds(torIds = [], { now = new Date() } = {}) {
  const ids = [...new Set(torIds.filter(Boolean).map(String))];
  if (!ids.length) return { scored: 0, vertexScored: 0 };

  const settings = await classification.readSettings();
  const medians = await categoryMedians();
  const tors = await TOR.find({
    _id: { $in: ids },
    reviewStatus: { $nin: ["approved", "rejected"] },
  })
    .select(
      "budgetThb deadline category department departmentTh publishedAt title titleTh status source summary summaryTh ocr reviewStatus",
    )
    .lean();

  if (!tors.length) return { scored: 0, vertexScored: 0 };

  const heuristicOps = [];
  const vertexCandidates = [];
  for (const tor of tors) {
    const heuristic = confidenceOf(tor);
    const integrityFlags = integrityReasons(tor, medians.get(tor.category));
    const integrity = resolveIntegrityFields(integrityFlags);
    const band = reviewBand(
      heuristic.confidence,
      settings.autoThreshold,
      settings.reviewThreshold,
    );
    heuristicOps.push({
      updateOne: {
        filter: { _id: tor._id },
        update: {
          $set: {
            confidence: heuristic.confidence,
            reviewMissing: heuristic.missing,
            reviewStatus: band,
            reviewScoreSource: "heuristic",
            reviewScoreReason: heuristic.missing.length
              ? `Missing ${heuristic.missing.join(", ")}`
              : "Heuristic complete",
            reviewScoredAt: now,
            ...integrity,
          },
        },
      },
    });
    if (isReviewEligible(tor, now) && (band === "review" || band === "manual")) {
      vertexCandidates.push({
        tor,
        heuristic: { ...heuristic, integrityFlags },
      });
    }
  }
  if (heuristicOps.length) await TOR.bulkWrite(heuristicOps);

  let vertexScored = 0;
  if (vertexCandidates.length && vertexConfigured()) {
    const concurrency = Math.max(1, Math.min(5, Number(process.env.VERTEX_SCORE_CONCURRENCY) || 3));
    const vertexOps = [];
    await mapPool(vertexCandidates, concurrency, async ({ tor, heuristic }) => {
      const result = await scoreWithVertex(tor, heuristic);
      if (!result.ok) return;
      const integrity = resolveIntegrityFields(heuristic.integrityFlags || [], result);
      vertexOps.push({
        updateOne: {
          filter: { _id: tor._id },
          update: {
            $set: {
              confidence: result.confidence,
              reviewMissing: result.issues.length ? result.issues : heuristic.missing,
              reviewStatus: reviewBand(
                result.confidence,
                settings.autoThreshold,
                settings.reviewThreshold,
              ),
              reviewScoreSource: "vertex",
              reviewScoreReason: result.reason,
              reviewScoredAt: new Date(),
              ...integrity,
            },
          },
        },
      });
      vertexScored += 1;
    });
    if (vertexOps.length) await TOR.bulkWrite(vertexOps);
  }

  return { scored: heuristicOps.length, vertexScored };
}

module.exports = { scoreTorIds, categoryMedians };
