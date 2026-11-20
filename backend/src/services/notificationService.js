const torMatchRepository = require("@/repositories/tor/torMatchRepository");
const torRepository = require("@/repositories/tor/torRepository");
const notificationRepository = require("@/repositories/notificationRepository");
const { MIN_EMAIL_MATCH_PERCENT, EMAIL_DEADLINE_WINDOW_MS } = require("@/constants/emailAlertConstants");

function notificationBody(tor) {
  const title = tor.title || tor.titleTh || "TOR";
  const titleTh = tor.titleTh || tor.title || "TOR";
  const department = tor.department || tor.departmentTh || "";
  const departmentTh = tor.departmentTh || tor.department || "";
  return {
    body: department ? `${title} · ${department}` : title,
    bodyTh: departmentTh ? `${titleTh} · ${departmentTh}` : titleTh,
  };
}

async function createMatchNotification(userId, tor) {
  return notificationRepository.createIfAbsent({
    key: `match:${userId}:${tor._id}`,
    userId,
    torId: tor._id,
    kind: "match",
    ...notificationBody(tor),
  });
}

async function syncCurrentAlerts(now = new Date()) {
  const tors = await torRepository.findNotificationTors(now, new Date(now.getTime() + EMAIL_DEADLINE_WINDOW_MS));
  if (!tors.length) return 0;
  const matches = await torMatchRepository.findActiveNotificationMatches(tors.map((tor) => tor._id));
  const byId = new Map(tors.map((tor) => [String(tor._id), tor]));
  let created = 0;

  for (const match of matches) {
    if (Number(match.matchPercent) < MIN_EMAIL_MATCH_PERCENT) continue;
    const tor = byId.get(String(match.torId));
    if (!tor) continue;
    const base = { userId: match.userId, torId: tor._id, ...notificationBody(tor) };
    if (["flagged", "confirmed"].includes(tor.integrityStatus)) {
      const flags = [...(tor.integrityFlags || [])].sort().join(",");
      created += await notificationRepository.createIfAbsent({
        ...base,
        key: `risk:${match.userId}:${tor._id}:${tor.integrityStatus}:${flags}`,
        kind: "risk",
      });
    }

    const deadline = tor.deadline || tor.ocr?.deadline;
    const deadlineAt = deadline ? new Date(deadline).getTime() : NaN;
    if (deadlineAt > now.getTime() && deadlineAt <= now.getTime() + EMAIL_DEADLINE_WINDOW_MS) {
      created += await notificationRepository.createIfAbsent({
        ...base,
        key: `deadline:${match.userId}:${tor._id}:${new Date(deadline).toISOString().slice(0, 10)}`,
        kind: "deadline",
      });
    }
  }
  return created;
}

async function getMine(userId) {
  return notificationRepository.findMine(userId);
}

async function updateMine(id, userId, fields) {
  const update = {};
  if (typeof fields.read === "boolean") update.read = fields.read;
  if (typeof fields.dismissed === "boolean") update.dismissed = fields.dismissed;
  if (!Object.keys(update).length) throw Object.assign(new Error("Invalid notification update."), { status: 400 });
  return notificationRepository.updateMine(id, userId, update);
}

async function markAllRead(userId) {
  await notificationRepository.markAllRead(userId);
}

module.exports = { createMatchNotification, getMine, markAllRead, syncCurrentAlerts, updateMine };
