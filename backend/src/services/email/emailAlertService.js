const userRepository = require("@/repositories/user/userRepository");
const {
  EMAIL_ALERT_CATEGORIES,
  DEFAULT_EMAIL_ALERT_PREFS,
} = require("@/constants/emailAlertConstants");

const categories = new Set(EMAIL_ALERT_CATEGORIES);

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function deliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function validPreferences(prefs) {
  return Boolean(prefs) &&
    ["emailMatches", "emailDeadlines", "emailIntegrity"].every(
      (key) => typeof prefs[key] === "boolean",
    ) &&
    ["budgetMinThb", "budgetMaxThb"].every(
      (key) => Number.isFinite(prefs[key]) && prefs[key] >= 0,
    ) &&
    prefs.budgetMaxThb >= prefs.budgetMinThb &&
    Array.isArray(prefs.categories) && prefs.categories.length <= categories.size &&
    prefs.categories.every((category) => categories.has(category)) &&
    new Set(prefs.categories).size === prefs.categories.length;
}

async function getPreferences(userId) {
  const user = await userRepository.findEmailAlertPrefsById(userId);
  if (!user) throw httpError(404, "User not found.");
  return {
    ...DEFAULT_EMAIL_ALERT_PREFS,
    ...(user.emailAlertPrefs?.savedAt ? user.emailAlertPrefs : {}),
    deliveryConfigured: deliveryConfigured(),
  };
}

async function savePreferences(userId, prefs) {
  if (!validPreferences(prefs)) {
    throw httpError(400, "Invalid email alert preferences.");
  }
  const current = await userRepository.findEmailAlertPrefsById(userId);
  if (!current) throw httpError(404, "User not found.");
  const now = new Date();
  const previous = current.emailAlertPrefs || {};
  const saved = {
    emailMatches: prefs.emailMatches,
    emailDeadlines: prefs.emailDeadlines,
    emailIntegrity: prefs.emailIntegrity,
    budgetMinThb: prefs.budgetMinThb,
    budgetMaxThb: prefs.budgetMaxThb,
    categories: prefs.categories,
    savedAt: now,
    matchSince: prefs.emailMatches && previous.emailMatches
      ? previous.matchSince || previous.savedAt || now
      : now,
    integritySince: prefs.emailIntegrity && previous.emailIntegrity
      ? previous.integritySince || previous.savedAt || now
      : now,
  };
  const user = await userRepository.updateEmailAlertPrefsById(userId, saved);
  if (!user) throw httpError(404, "User not found.");
  return { ...user.emailAlertPrefs, deliveryConfigured: deliveryConfigured() };
}

module.exports = { getPreferences, savePreferences };
