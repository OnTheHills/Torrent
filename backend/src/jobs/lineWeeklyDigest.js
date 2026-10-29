const User = require("@/models/User");
const Tor = require("@/models/TOR");
const { pushText, getQuota } = require("@/services/line/lineClient");

function weekAgo() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

async function findNewTorsSince(since) {
  return Tor.find({
    hidden: { $ne: true },
    $or: [{ publishedAt: { $gte: since } }, { createdAt: { $gte: since } }],
  })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(10)
    .select("title titleTh refId _id publishedAt createdAt")
    .lean();
}

function frontendBaseUrl() {
  const explicit = process.env.FRONTEND_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const fromCors = process.env.CORS_ORIGIN?.split(",")[0]?.trim();
  return (fromCors || "http://localhost:3000").replace(/\/+$/, "");
}

function torUrl(tor) {
  return `${frontendBaseUrl()}/app/tors/${tor._id}`;
}

function formatDigest(tors) {
  if (!tors.length) return "สัปดาห์นี้ยังไม่มี TOR ใหม่ในระบบ";

  const blocks = tors.map((tor, i) => {
    const title = tor.titleTh || tor.title || "Untitled";
    return `${i + 1}. ${title}\n${torUrl(tor)}`;
  });

  return [
    `TOR ใหม่สัปดาห์นี้ (${tors.length})`,
    "",
    blocks.join("\n────────\n"),
    "",
    `ดูทั้งหมด: ${frontendBaseUrl()}/app/tors`,
  ].join("\n");
}

async function runLineWeeklyDigest() {
  if (process.env.LINE_WEEKLY_DIGEST_ENABLED !== "true") {
    console.log("LINE weekly digest skipped (disabled)");
    return { sent: 0, skipped: true };
  }

  const quota = await getQuota();
  if (quota.type === "limited" && quota.value != null) {
    const remaining = quota.value - quota.totalUsage;
    if (remaining <= 0) {
      console.warn("LINE quota exhausted; abort digest");
      return { sent: 0, quotaExhausted: true };
    }
  }

  const tors = await findNewTorsSince(weekAgo());
  const text = formatDigest(tors);

  // Free-plan safety: hard cap recipients for practice
  const MAX_RECIPIENTS = 50;

  const users = await User.find({
    lineDigestEnabled: true,
    lineUserId: { $ne: null },
    disabled: { $ne: true },
    role: { $in: ["vendor", "admin"] },
  })
    .select("lineUserId email")
    .limit(MAX_RECIPIENTS)
    .lean();

  let sent = 0;
  for (const user of users) {
    try {
      await pushText(user.lineUserId, text);
      sent += 1;
    } catch (err) {
      console.error("LINE push failed for", user.email, err.message);
    }
  }

  return { sent, tors: tors.length, recipients: users.length };
}

module.exports = { runLineWeeklyDigest };
