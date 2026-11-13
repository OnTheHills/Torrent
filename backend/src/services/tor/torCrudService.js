const { isDeepStrictEqual } = require("node:util");
const TOR = require("@/models/tor/TOR");
const torRepository = require("@/repositories/tor/torRepository");
const torMatching = require("@/jobs/matchTors");
const {
  flatRequirements,
  flatRequirementsEn,
  normalizeRequirementItems,
} = require("@/services/tor/requirementCategories");
const {
  categorizeRequirementItems,
  isGenericIntegrityNoteEn,
  looksThai,
  translateIntegrityNoteToEn,
} = require("@/services/tor/translateIntegrityNote");

async function createTor(data) {
  const tor = await torRepository.create(data);
  await torMatching.enqueueTor(tor._id);
  return tor;
}

async function getAllTors() {
  return torRepository.findAll();
}

async function getBudgetPeers(category) {
  return torRepository.findBudgetPeers(category);
}

/**
 * Ensure integrityNoteEn is a 1:1 English translation of the Thai note.
 * Replaces missing or generic flag-label English (e.g. "Other procurement signal").
 */
async function ensureIntegrityNoteEn(tor) {
  if (!tor) return tor;
  const noteTh = String(tor.integrityNote || "").trim();
  if (!noteTh || !looksThai(noteTh)) return tor;

  const noteEn = String(tor.integrityNoteEn || "").trim();
  if (noteEn && !isGenericIntegrityNoteEn(noteEn)) return tor;

  const translated = await translateIntegrityNoteToEn(noteTh);
  if (!translated) return tor;

  await TOR.updateOne(
    { _id: tor._id },
    { $set: { integrityNoteEn: translated } },
  );
  return { ...tor, integrityNoteEn: translated };
}

function requirementList(tor) {
  const ocr = tor?.ocr && typeof tor.ocr === "object" ? tor.ocr : null;
  if (Array.isArray(ocr?.requirements) && ocr.requirements.length) {
    return ocr.requirements.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (Array.isArray(tor?.requirements) && tor.requirements.length) {
    return tor.requirements.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return [];
}

function requirementEnList(tor) {
  const ocr = tor?.ocr && typeof tor.ocr === "object" ? tor.ocr : null;
  if (Array.isArray(ocr?.requirementsEn) && ocr.requirementsEn.length) {
    return ocr.requirementsEn.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return [];
}

function existingRequirementItems(tor) {
  const ocr = tor?.ocr && typeof tor.ocr === "object" ? tor.ocr : null;
  return normalizeRequirementItems(
    ocr?.requirementItems,
    requirementList(tor),
    requirementEnList(tor),
  );
}

function itemsHaveEnglish(items, thCount) {
  if (!Array.isArray(items) || items.length !== thCount) return false;
  return items.every((item) => Boolean(String(item.textEn || "").trim()));
}

/**
 * Ensure requirementItems are categorized with 1:1 English text.
 * Runs on detail fetch for existing flat OCR rows.
 */
async function ensureRequirementGroups(tor) {
  if (!tor) return tor;
  const th = requirementList(tor);
  if (!th.length) return tor;

  const stored = Array.isArray(tor.ocr?.requirementItems)
    ? normalizeRequirementItems(tor.ocr.requirementItems)
    : [];
  const current = stored.length ? stored : existingRequirementItems(tor);
  const hasStoredGroups = stored.length === th.length;
  const hasEn = itemsHaveEnglish(current, th.length);

  if (hasStoredGroups && hasEn) {
    return {
      ...tor,
      ocr: {
        ...(tor.ocr || {}),
        requirementItems: current,
        requirements: flatRequirements(current),
        requirementsEn: flatRequirementsEn(current),
      },
      requirements: flatRequirements(current),
      requirementsEn: flatRequirementsEn(current),
    };
  }

  const categorized = await categorizeRequirementItems(th);
  if (!categorized.length) {
    // Fall back to whatever we already have (may be uncategorized / Thai-only).
    return {
      ...tor,
      ocr: {
        ...(tor.ocr || {}),
        requirementItems: current.length ? current : undefined,
        requirements: th,
        requirementsEn: requirementEnList(tor),
      },
      requirements: th,
      requirementsEn: requirementEnList(tor),
    };
  }

  await TOR.updateOne(
    { _id: tor._id },
    {
      $set: {
        "ocr.requirementItems": categorized,
        "ocr.requirements": flatRequirements(categorized),
        "ocr.requirementsEn": flatRequirementsEn(categorized),
      },
    },
  );

  return {
    ...tor,
    ocr: {
      ...(tor.ocr || {}),
      requirementItems: categorized,
      requirements: flatRequirements(categorized),
      requirementsEn: flatRequirementsEn(categorized),
    },
    requirements: flatRequirements(categorized),
    requirementsEn: flatRequirementsEn(categorized),
  };
}

async function localizeTor(tor) {
  const withNote = await ensureIntegrityNoteEn(tor);
  return ensureRequirementGroups(withNote);
}

async function getTorById(id) {
  const tor = await torRepository.findById(id);
  return localizeTor(tor);
}

async function updateTor(id, data = {}) {
  const previous = await torRepository.findById(id);
  if (!previous) return null;
  const tor = await torRepository.update(id, data);
  const before =
    typeof previous.toObject === "function" ? previous.toObject() : previous;
  const after =
    tor && typeof tor.toObject === "function" ? tor.toObject() : tor;
  if (after && Object.keys(data).some((field) => !isDeepStrictEqual(before[field], after[field]))) {
    await torMatching.enqueueTor(tor._id);
  }
  return tor;
}

async function deleteTor(id) {
  return torRepository.remove(id);
}

module.exports = {
  createTor,
  deleteTor,
  ensureIntegrityNoteEn,
  ensureRequirementGroups,
  /** @deprecated use ensureRequirementGroups */
  ensureRequirementsEn: ensureRequirementGroups,
  getAllTors,
  getBudgetPeers,
  getTorById,
  updateTor,
};
