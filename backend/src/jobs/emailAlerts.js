const User = require("@/models/User");
const TOR = require("@/models/TOR");
const TORMatch = require("@/models/TORMatch");
const EmailAlert = require("@/models/EmailAlert");
const { fitScoreApplies } = require("@/jobs/matchTors");
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
  DEFAULT_EMAIL_FRONTEND_URL,
  EMAIL_SUBJECT_TITLE_MAX_LENGTH,
} = require("@/constants/emailAlertConstants");

function matchesPreferences(tor, prefs) {
  if (!tor || tor.hidden || !fitScoreApplies(tor)) return false;
  if (prefs.categories.length && !prefs.categories.includes(tor.category)) return false;
  const budget = Number(tor.budgetThb || tor.ocr?.budgetThb);
  return Number.isFinite(budget) && budget >= prefs.budgetMinThb && budget <= prefs.budgetMaxThb;
}

function torLink(torId) {
  const base = process.env.FRONTEND_URL?.trim() || process.env.CORS_ORIGIN?.split(",")[0]?.trim() || DEFAULT_EMAIL_FRONTEND_URL;
  return `${base.replace(/\/+$/, "")}/app/tors/${torId}`;
}

function message(kind, tor, score) {
  const title = String(tor.titleTh || tor.title || "TOR").replace(/[\r\n]+/g, " ").slice(0, EMAIL_SUBJECT_TITLE_MAX_LENGTH);
  const url = torLink(tor._id);
  if (kind === "match") return {
    subject: `Torrent match: ${title}`,
    text: `A TOR matches your vendor profile (${score}% fit).\n\n${title}\n${url}\n\nManage email alerts in Torrent Smart Alert.`,
  };
  if (kind === "deadline") return {
    subject: `Torrent deadline approaching: ${title}`,
    text: `A matched TOR closes within 3 days.\n\n${title}\n${url}\n\nManage email alerts in Torrent Smart Alert.`,
  };
  return {
    subject: `Torrent integrity update: ${title}`,
    text: `A matched TOR has an integrity warning. Review its details before proceeding.\n\n${title}\n${url}\n\nManage email alerts in Torrent Smart Alert.`,
  };
}

async function queueAlert(user, match, tor, kind, detail) {
  const key = `${kind}:${user._id}:${tor._id}:${detail}`;
  const body = message(kind, tor, Number(match.matchPercent));
  try {
    const result = await EmailAlert.updateOne(
      { key },
      { $setOnInsert: { key, userId: user._id, torId: tor._id, kind, to: user.email, ...body } },
      { upsert: true },
    );
    return result?.upsertedCount || 0;
  } catch (error) {
    if (error.code === 11000) return 0;
    throw error;
  }
}

async function queueEligibleAlerts(now = new Date()) {
  const users = await User.find({
    role: { $in: ["vendor", "admin"] }, disabled: { $ne: true }, emailVerified: true,
    "emailAlertPrefs.savedAt": { $exists: true },
  }).select("_id email emailAlertPrefs").lean();
  let queued = 0;
  for (const user of users) {
    const prefs = user.emailAlertPrefs;
    if (!prefs.emailMatches && !prefs.emailDeadlines && !prefs.emailIntegrity) continue;
    const matches = await TORMatch.find({ userId: user._id, dismissedAt: null, badResultAt: null })
      .select("_id torId matchPercent createdAt").lean();
    const eligible = matches.filter((match) => Number(match.matchPercent) >= MIN_EMAIL_MATCH_PERCENT);
    if (!eligible.length) continue;
    const tors = await TOR.find({ _id: { $in: eligible.map((match) => match.torId) } })
      .select("_id title titleTh hidden status source category budgetThb ocr.budgetThb deadline ocr.deadline integrityStatus updatedAt")
      .lean();
    const byId = new Map(tors.map((tor) => [String(tor._id), tor]));
    for (const match of eligible) {
      const tor = byId.get(String(match.torId));
      if (!matchesPreferences(tor, prefs)) continue;
      if (prefs.emailMatches && match.createdAt >= (prefs.matchSince || prefs.savedAt)) {
        queued += await queueAlert(user, match, tor, "match", String(match._id));
      }
      const deadline = tor.deadline || tor.ocr?.deadline;
      if (prefs.emailDeadlines && deadline) {
        const closesAt = new Date(deadline).getTime();
        if (closesAt > now.getTime() && closesAt <= now.getTime() + EMAIL_DEADLINE_WINDOW_MS) {
          queued += await queueAlert(user, match, tor, "deadline", new Date(deadline).toISOString().slice(0, 10));
        }
      }
      if (prefs.emailIntegrity && ["flagged", "confirmed"].includes(tor.integrityStatus) && tor.updatedAt >= (prefs.integritySince || prefs.savedAt)) {
        queued += await queueAlert(user, match, tor, "integrity", tor.integrityStatus);
      }
    }
  }
  return queued;
}

async function sendEmail(alert) {
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": alert.key,
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [alert.to], subject: alert.subject, text: alert.text }),
    signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const error = new Error(`Resend HTTP ${response.status}`);
    error.permanent = response.status >= 400 && response.status < 500 && response.status !== 429;
    throw error;
  }
}

async function deliverPendingAlerts(now = new Date()) {
  let sent = 0;
  for (let i = 0; i < MAX_EMAIL_SENDS_PER_RUN; i++) {
    const alert = await EmailAlert.findOneAndUpdate(
      { $or: [
        { status: "pending", retryAt: { $lte: now } },
        { status: "sending", leaseUntil: { $lte: now } },
      ] },
      { $set: { status: "sending", leaseUntil: new Date(Date.now() + EMAIL_SEND_LEASE_MS) }, $inc: { attempts: 1 } },
      { sort: { createdAt: 1 }, returnDocument: "after" },
    ).lean();
    if (!alert) break;
    try {
      const user = await User.findById(alert.userId).select("email emailVerified disabled emailAlertPrefs").lean();
      const enabled = EMAIL_PREF_BY_KIND[alert.kind];
      const [tor, match] = await Promise.all([
        TOR.findById(alert.torId).lean(),
        TORMatch.findOne({ userId: alert.userId, torId: alert.torId, dismissedAt: null, badResultAt: null }).lean(),
      ]);
      const deadline = tor?.deadline || tor?.ocr?.deadline;
      const stillRelevant = user && !user.disabled && user.emailVerified && user.email === alert.to &&
        user.emailAlertPrefs?.[enabled] && match && Number(match.matchPercent) >= MIN_EMAIL_MATCH_PERCENT &&
        matchesPreferences(tor, user.emailAlertPrefs) &&
        (alert.kind !== "deadline" || (deadline && new Date(deadline) > new Date())) &&
        (alert.kind !== "integrity" || ["flagged", "confirmed"].includes(tor.integrityStatus));
      if (!stillRelevant) {
        await EmailAlert.updateOne({ _id: alert._id, status: "sending" }, { $set: { status: "failed", leaseUntil: null, lastError: "Alert no longer relevant" } });
        continue;
      }
      await sendEmail(alert);
      await EmailAlert.updateOne({ _id: alert._id, status: "sending" }, { $set: { status: "sent", sentAt: new Date(), leaseUntil: null } });
      sent++;
    } catch (error) {
      const status = error.permanent ? "failed" : "pending";
      const backoff = Math.min(EMAIL_RETRY_MAX_MINUTES, 2 ** Math.min(alert.attempts, EMAIL_RETRY_EXPONENT_CAP)) * EMAIL_RETRY_BASE_MS;
      await EmailAlert.updateOne({ _id: alert._id, status: "sending" }, {
        $set: { status, leaseUntil: null, retryAt: new Date(Date.now() + backoff), lastError: error.message },
      });
      console.error("Email alert delivery failed", { key: alert.key, message: error.message });
    }
  }
  return sent;
}

async function runEmailAlerts() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { skipped: "email provider not configured" };
  const queued = await queueEligibleAlerts();
  const sent = await deliverPendingAlerts();
  return { queued, sent };
}

module.exports = { matchesPreferences, queueEligibleAlerts, deliverPendingAlerts, runEmailAlerts, sendEmail };
