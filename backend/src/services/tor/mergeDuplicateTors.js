const TOR = require("@/models/TOR");
const TORMatch = require("@/models/TORMatch");
const TorMatchJob = require("@/models/TorMatchJob");

const MERGEABLE_SOURCES = ["EGP-PROCESS5", "DATA-GO-EGP", "EGP-RSS", "SME-GP"];

const TRUST_RANK = {
  "EGP-PROCESS5": 100,
  "DATA-GO-EGP": 80,
  "EGP-RSS": 60,
  "SME-GP": 40,
};

const LIFECYCLE_RANK = {
  cancelled: 50,
  awarded: 40,
  published: 30,
  draft: 20,
  discovered: 10,
};

const MERGE_FIELDS = [
  "title",
  "titleTh",
  "status",
  "budgetThb",
  "deadline",
  "publishedAt",
  "egpUrl",
  "documentUrl",
  "department",
  "departmentTh",
  "category",
  "summary",
  "priceBuildThb",
  "budgetYear",
  "egpDeptId",
  "egpDeptSubId",
  "torPdfPath",
];

// Different feeds always publish different listing/document URLs; keep both in sources[].
const NON_CONFLICT_FIELDS = new Set([
  "egpUrl",
  "documentUrl",
  "torPdfPath",
  "summary",
  "egpDeptId",
  "egpDeptSubId",
]);

function trustOf(source) {
  return TRUST_RANK[source] || 0;
}

function lifecycleOf(status) {
  return LIFECYCLE_RANK[String(status || "").toLowerCase()] || 0;
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return true;
}

function normalizeComparable(field, value) {
  if (!hasValue(value)) return null;
  if (field === "budgetThb" || field === "priceBuildThb") {
    return Number(value) || 0;
  }
  if (field === "deadline" || field === "publishedAt") {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }
  return String(value).trim().replace(/\s+/g, " ");
}

function valuesConflict(field, left, right) {
  const a = normalizeComparable(field, left);
  const b = normalizeComparable(field, right);
  if (a === null || b === null) return false;
  return a !== b;
}

function pickAdvancedStatus(trustedStatus, otherStatus) {
  return lifecycleOf(otherStatus) > lifecycleOf(trustedStatus) ? otherStatus : trustedStatus;
}

function snapshotOf(tor, { absorbedTorId } = {}) {
  return {
    source: tor.source,
    refId: tor.refId,
    egpUrl: tor.egpUrl || "",
    documentUrl: tor.documentUrl || "",
    status: tor.status || "",
    budgetThb: tor.budgetThb,
    deadline: tor.deadline || tor.ocr?.deadline,
    publishedAt: tor.publishedAt,
    title: tor.titleTh || tor.title || "",
    lastSeenAt: new Date(),
    ...(absorbedTorId ? { absorbedTorId } : {}),
  };
}

function conflictSummary(conflicts) {
  if (!conflicts.length) return "";
  return `Source conflict: ${conflicts
    .map(
      (item) =>
        `${item.field} (${item.trustedSource} ${stringifyValue(item.trustedValue)} vs ${item.otherSource} ${stringifyValue(item.otherValue)})`,
    )
    .join("; ")}`;
}

function stringifyValue(value) {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function effectiveDeadline(tor) {
  return tor.deadline || tor.ocr?.deadline;
}

function mergePair(survivor, secondary) {
  const trustedIsSurvivor = trustOf(survivor.source) >= trustOf(secondary.source);
  const trusted = trustedIsSurvivor ? survivor : secondary;
  const other = trustedIsSurvivor ? secondary : survivor;
  const patch = {};
  const conflicts = [];

  for (const field of MERGE_FIELDS) {
    const trustedValue = field === "deadline" ? effectiveDeadline(trusted) : trusted[field];
    const otherValue = field === "deadline" ? effectiveDeadline(other) : other[field];

    if (field === "status" && hasValue(trustedValue) && hasValue(otherValue) && valuesConflict(field, trustedValue, otherValue)) {
      const chosen = pickAdvancedStatus(trustedValue, otherValue);
      patch.status = chosen;
      conflicts.push({
        field,
        trustedSource: trusted.source,
        otherSource: other.source,
        trustedValue,
        otherValue,
        resolution: chosen === trustedValue ? "trusted" : "lifecycle_advanced",
      });
      continue;
    }

    if (valuesConflict(field, trustedValue, otherValue)) {
      // Survivor keeps the trusted feed's catalog fields; URLs stay multi-source only.
      if (!NON_CONFLICT_FIELDS.has(field)) {
        patch[field] = trustedValue;
        if (field === "title" && hasValue(trusted.titleTh || trusted.title)) {
          patch.titleTh = trusted.titleTh || trusted.title;
        }
        conflicts.push({
          field,
          trustedSource: trusted.source,
          otherSource: other.source,
          trustedValue,
          otherValue,
          resolution: "trusted",
        });
      } else if (field === "egpUrl" || field === "documentUrl" || field === "torPdfPath") {
        // Prefer Process5 listing/document on the survivor card when present.
        if (hasValue(trustedValue) && survivor[field] !== trustedValue) {
          patch[field] = trustedValue;
        }
      }
      continue;
    }

    if (!hasValue(survivor[field === "deadline" ? "deadline" : field]) && hasValue(otherValue)) {
      if (field === "deadline") {
        if (!survivor.deadline) patch.deadline = otherValue;
      } else {
        patch[field] = otherValue;
        if (field === "title" && !survivor.titleTh && (other.titleTh || other.title)) {
          patch.titleTh = other.titleTh || other.title;
        }
      }
    }
  }

  // Prefer Process5 OCR / document richness that may only live on one side.
  if (!survivor.documentUrl && secondary.documentUrl) patch.documentUrl = secondary.documentUrl;
  if (!survivor.torPdfPath && secondary.torPdfPath) patch.torPdfPath = secondary.torPdfPath;
  if (!survivor.ocr && secondary.ocr) patch.ocr = secondary.ocr;

  const sources = [
    snapshotOf(survivor),
    snapshotOf(secondary, { absorbedTorId: secondary._id }),
  ];

  const mergeStatus = conflicts.length ? "conflicted" : "clean";
  if (conflicts.length) {
    patch.reviewStatus = "review";
    patch.reviewScoreReason = conflictSummary(conflicts);
    patch.mergeStatus = "conflicted";
    patch.mergeConflicts = conflicts;
  } else {
    patch.mergeStatus = "clean";
    patch.mergeConflicts = [];
  }

  patch.sources = sources;
  return { patch, conflicts, mergeStatus, sources };
}

async function clearMatches(torIds) {
  if (!torIds.length) return;
  await Promise.all([
    TORMatch.deleteMany({ torId: { $in: torIds } }),
    TorMatchJob.deleteMany({ torId: { $in: torIds } }),
  ]);
}

async function absorbSecondary(survivorId, secondary) {
  await TOR.findByIdAndUpdate(secondary._id, {
    $set: {
      hidden: true,
      hiddenReason: "merged",
      mergeStatus: "clean",
    },
  });
  await clearMatches([secondary._id]);
}

async function mergeGroup(tors) {
  if (tors.length < 2) return null;
  const ranked = [...tors].sort((a, b) => {
    const trustDiff = trustOf(b.source) - trustOf(a.source);
    if (trustDiff) return trustDiff;
    return String(a._id).localeCompare(String(b._id));
  });
  const survivor = ranked[0];
  const secondaries = ranked.slice(1);

  let working = { ...survivor };
  let allConflicts = [];
  let allSources = [snapshotOf(survivor)];

  for (const secondary of secondaries) {
    const { patch, conflicts, sources } = mergePair(working, secondary);
    working = { ...working, ...patch };
    allConflicts = [...allConflicts, ...conflicts];
    const byKey = new Map(allSources.map((row) => [`${row.source}:${row.refId}`, row]));
    for (const row of sources) byKey.set(`${row.source}:${row.refId}`, row);
    allSources = [...byKey.values()];
    await absorbSecondary(survivor._id, secondary);
  }

  // Dedupe conflicts by field+otherSource so repeated re-syncs stay readable.
  const conflictKey = (item) => `${item.field}:${item.otherSource}`;
  allConflicts = [...new Map(allConflicts.map((item) => [conflictKey(item), item])).values()];

  const finalPatch = { sources: allSources };
  for (const field of MERGE_FIELDS) {
    if (working[field] !== undefined && !Object.is(working[field], survivor[field])) {
      finalPatch[field] = working[field];
    }
  }
  if (working.titleTh && working.titleTh !== survivor.titleTh) finalPatch.titleTh = working.titleTh;
  if (working.ocr && working.ocr !== survivor.ocr) finalPatch.ocr = working.ocr;

  if (allConflicts.length) {
    finalPatch.mergeStatus = "conflicted";
    finalPatch.mergeConflicts = allConflicts;
    finalPatch.reviewStatus = "review";
    finalPatch.reviewScoreReason = conflictSummary(allConflicts);
  } else {
    finalPatch.mergeStatus = "clean";
    finalPatch.mergeConflicts = [];
  }

  await TOR.findByIdAndUpdate(survivor._id, { $set: finalPatch });
  return {
    survivorId: survivor._id,
    absorbedIds: secondaries.map((tor) => tor._id),
    conflicted: allConflicts.length > 0,
    conflicts: allConflicts,
  };
}

async function mergeByRefIds(refIds = []) {
  const ids = [...new Set(refIds.map(String).filter(Boolean))];
  const summary = {
    groups: 0,
    merged: 0,
    conflicted: 0,
    survivorIds: [],
    conflictedSurvivorIds: [],
    absorbedIds: [],
  };
  if (!ids.length) return summary;

  // Include previously absorbed twins so a re-sync of the lower-trust feed
  // still folds fresh fields into the survivor instead of only updating the hidden row.
  const rows = await TOR.find({
    refId: { $in: ids },
    source: { $in: MERGEABLE_SOURCES },
    $or: [{ hidden: { $ne: true } }, { hiddenReason: "merged" }],
  }).lean();

  const byRef = new Map();
  for (const tor of rows) {
    const list = byRef.get(tor.refId) || [];
    list.push(tor);
    byRef.set(tor.refId, list);
  }

  for (const group of byRef.values()) {
    if (group.length < 2) continue;
    // Prefer the visible row when the same source appears twice.
    const uniqueSources = new Map();
    for (const tor of group) {
      const current = uniqueSources.get(tor.source);
      if (!current || (current.hidden && !tor.hidden)) uniqueSources.set(tor.source, tor);
    }
    if (uniqueSources.size < 2) continue;
    summary.groups += 1;
    const result = await mergeGroup([...uniqueSources.values()]);
    if (!result) continue;
    summary.merged += 1;
    summary.survivorIds.push(result.survivorId);
    summary.absorbedIds.push(...result.absorbedIds);
    if (result.conflicted) {
      summary.conflicted += 1;
      summary.conflictedSurvivorIds.push(result.survivorId);
    }
  }

  return summary;
}

async function reconcileAll() {
  const duplicates = await TOR.aggregate([
    {
      $match: {
        source: { $in: MERGEABLE_SOURCES },
        refId: { $exists: true, $ne: "" },
        $or: [{ hidden: { $ne: true } }, { hiddenReason: "merged" }],
      },
    },
    {
      $group: {
        _id: "$refId",
        sources: { $addToSet: "$source" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gte: 2 }, "sources.1": { $exists: true } } },
  ]);
  return mergeByRefIds(duplicates.map((row) => row._id));
}

module.exports = {
  MERGEABLE_SOURCES,
  TRUST_RANK,
  LIFECYCLE_RANK,
  conflictSummary,
  mergeByRefIds,
  mergePair,
  reconcileAll,
  trustOf,
  lifecycleOf,
  valuesConflict,
  pickAdvancedStatus,
};
