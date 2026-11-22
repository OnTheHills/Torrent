const { hashHex, DEFAULT_HASH_ALGORITHM } = require("@/utils/cryptoAlgorithms");
const { readSecret } = require("@/config/secrets");
const userRepository = require("@/repositories/user/userRepository");
const torRepository = require("@/repositories/tor/torRepository");
const torMatchRepository = require("@/repositories/tor/torMatchRepository");
const emailAlertRepository = require("@/repositories/email/emailAlertRepository");
const notificationService = require("@/services/notificationService");
const { fitScoreApplies } = require("@/jobs/matchTors");
const { alertMessage } = require("@/utils/email/alertTemplate");
const {
  EMAIL_PREF_BY_KIND,
  MIN_EMAIL_MATCH_PERCENT,
  EMAIL_DEADLINE_WINDOW_MS,
  MAX_EMAIL_SENDS_PER_RUN,
  EMAIL_SEND_LEASE_MS,
  EMAIL_RETRY_BASE_MS,
  EMAIL_RETRY_MAX_MINUTES,
  EMAIL_RETRY_EXPONENT_CAP,
  EMAIL_REQUEST_TIMEOUT_MS,
  RESEND_EMAILS_URL,
} = require("@/constants/emailAlertConstants");

function matchesPreferences(tor, prefs) {
  if (!tor || tor.hidden || !fitScoreApplies(tor)) return false;
  if (prefs.categories.length && !prefs.categories.includes(tor.category)) return false;
  const budget = Number(tor.budgetThb || tor.ocr?.budgetThb);
  return Number.isFinite(budget) && budget >= prefs.budgetMinThb && budget <= prefs.budgetMaxThb;
}

async function queueAlert(user, match, tor, kind, detail, recipientHashAlgorithm) {
  const key = `${kind}:${user._id}:${tor._id}:${detail}`;
  return emailAlertRepository.queue({ key, userId: user._id, torId: tor._id, kind, recipientHashAlgorithm });
}

async function queueEligibleAlerts(now = new Date(), recipientHashAlgorithm) {
  const users = await userRepository.findUsersEligibleForEmailAlerts();
  let queued = 0;
  for (const user of users) {
    const prefs = user.emailAlertPrefs;
    if (!prefs.emailMatches && !prefs.emailDeadlines && !prefs.emailIntegrity) continue;
    const matches = await torMatchRepository.findActiveEmailMatchesByUserId(user._id);
    const eligible = matches.filter((match) => Number(match.matchPercent) >= MIN_EMAIL_MATCH_PERCENT);
    if (!eligible.length) continue;
    const tors = await torRepository.findEmailAlertTorsByIds(eligible.map((match) => match.torId));
    const byId = new Map(tors.map((tor) => [String(tor._id), tor]));
    for (const match of eligible) {
      const tor = byId.get(String(match.torId));
      if (!matchesPreferences(tor, prefs)) continue;
      if (prefs.emailMatches && match.createdAt >= (prefs.matchSince || prefs.savedAt)) {
        queued += await queueAlert(user, match, tor, "match", String(match._id), recipientHashAlgorithm);
      }
      const deadline = tor.deadline || tor.ocr?.deadline;
      if (prefs.emailDeadlines && deadline) {
        const closesAt = new Date(deadline).getTime();
        if (closesAt > now.getTime() && closesAt <= now.getTime() + EMAIL_DEADLINE_WINDOW_MS) {
          queued += await queueAlert(user, match, tor, "deadline", new Date(deadline).toISOString().slice(0, 10), recipientHashAlgorithm);
        }
      }
      if (prefs.emailIntegrity && ["flagged", "confirmed"].includes(tor.integrityStatus) && tor.updatedAt >= (prefs.integritySince || prefs.savedAt)) {
        queued += await queueAlert(user, match, tor, "integrity", tor.integrityStatus, recipientHashAlgorithm);
      }
    }
  }
  return queued;
}

async function sendEmail(alert, user, tor, match) {
  const body = alertMessage(alert.kind, tor, match);
  // Keep retries idempotent per recipient when a user's email changes.
  // Existing ledger entries retain their algorithm across retries and upgrades.
  // Rows created before this field existed always used SHA-256.
  const recipientKey = hashHex(user.email, { algorithm: alert.recipientHashAlgorithm ?? "sha256" }).slice(0, 16);
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${readSecret("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `${alert.key}:${recipientKey}`,
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [user.email], ...body }),
    signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const reason = typeof details?.message === "string"
      ? details.message.replace(/[\r\n]+/g, " ").slice(0, 300)
      : "";
    const error = new Error(`Resend HTTP ${response.status}${reason ? `: ${reason}` : ""}`);
    error.permanent = response.status >= 400 && response.status < 500 && response.status !== 429;
    throw error;
  }
}

async function deliverPendingAlerts(now = new Date()) {
  let sent = 0;
  for (let i = 0; i < MAX_EMAIL_SENDS_PER_RUN; i++) {
    const alert = await emailAlertRepository.claimNext(now, new Date(Date.now() + EMAIL_SEND_LEASE_MS));
    if (!alert) break;
    try {
      const user = await userRepository.findEmailDeliveryUserById(alert.userId);
      const enabled = EMAIL_PREF_BY_KIND[alert.kind];
      const [tor, match] = await Promise.all([
        torRepository.findById(alert.torId),
        torMatchRepository.findActiveEmailMatch(alert.userId, alert.torId),
      ]);
      const deadline = tor?.deadline || tor?.ocr?.deadline;
      const deadlineAt = deadline ? new Date(deadline).getTime() : NaN;
      const stillRelevant = user && !user.disabled && user.emailVerified && user.email &&
        user.emailAlertPrefs?.[enabled] && match && Number(match.matchPercent) >= MIN_EMAIL_MATCH_PERCENT &&
        matchesPreferences(tor, user.emailAlertPrefs) &&
        (alert.kind !== "deadline" || (
          deadlineAt > Date.now() && deadlineAt <= Date.now() + EMAIL_DEADLINE_WINDOW_MS &&
          alert.key.endsWith(`:${new Date(deadline).toISOString().slice(0, 10)}`)
        )) &&
        (alert.kind !== "integrity" || (
          ["flagged", "confirmed"].includes(tor.integrityStatus) &&
          alert.key.endsWith(`:${tor.integrityStatus}`)
        ));
      if (!stillRelevant) {
        await emailAlertRepository.updateSending(alert._id, { status: "failed", lastError: "Alert no longer relevant" });
        continue;
      }
      await sendEmail(alert, user, tor, match);
      await emailAlertRepository.updateSending(alert._id, { status: "sent", sentAt: new Date() });
      sent++;
    } catch (error) {
      const status = error.permanent ? "failed" : "pending";
      const backoff = Math.min(EMAIL_RETRY_MAX_MINUTES, 2 ** Math.min(alert.attempts, EMAIL_RETRY_EXPONENT_CAP)) * EMAIL_RETRY_BASE_MS;
      await emailAlertRepository.updateSending(alert._id, {
        status, retryAt: new Date(Date.now() + backoff), lastError: error.message,
      });
      console.error("Email alert delivery failed", { key: alert.key, message: error.message });
    }
  }
  return sent;
}

async function runEmailAlerts({ recipientHashAlgorithm = DEFAULT_HASH_ALGORITHM } = {}) {
  // Validate before any queue writes or deliveries. Only newly inserted alerts
  // use this choice; the repository's $setOnInsert preserves existing entries.
  hashHex("", { algorithm: recipientHashAlgorithm });
  const notificationsCreated = await notificationService.syncCurrentAlerts();
  if (!readSecret("RESEND_API_KEY") || !process.env.EMAIL_FROM) {
    return { notificationsCreated, skipped: "email provider not configured" };
  }
  const queued = await queueEligibleAlerts(new Date(), recipientHashAlgorithm);
  const sent = await deliverPendingAlerts();
  return { notificationsCreated, queued, sent };
}

module.exports = { runEmailAlerts };
