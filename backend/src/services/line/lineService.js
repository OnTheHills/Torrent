const crypto = require("crypto");
const lineRepository = require("@/repositories/line/lineRepository");
const lineClient = require("@/services/line/lineClient");
const { LINK_CODE_TTL_MS, CODE_ALPHABET } = require("@/constants/lineConstants");

function verifySignature(rawBody, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET || "";
  if (!secret || !signature || !rawBody) return false;
  const hash = crypto.createHmac("SHA256", secret).update(rawBody).digest("base64");
  const expected = Buffer.from(hash);
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function makeLinkCode() {
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

function statusPayload(user) {
  return {
    linked: Boolean(user?.lineUserId),
    digestEnabled: Boolean(user?.lineDigestEnabled),
    linkedAt: user?.lineLinkedAt || null,
    pendingCode: user?.lineLinkCode || null,
    pendingExpiresAt: user?.lineLinkCodeExpiresAt || null,
    oaAddUrl: process.env.LINE_OA_ADD_URL || null,
  };
}

async function getStatus(userId) {
  const user = await lineRepository.findStatusByUserId(userId);
  if (!user) throw httpError(404, "User not found.");
  return statusPayload(user);
}

async function startLink(userId) {
  const code = makeLinkCode();
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);
  const user = await lineRepository.setLinkCode(userId, code, expiresAt);
  if (!user) throw httpError(404, "User not found.");
  return {
    ...statusPayload(user),
    instructions:
      "Add the Torrent LINE Official Account, then send this code as a message to finish linking.",
  };
}

async function unlink(userId) {
  const user = await lineRepository.unlinkUser(userId);
  if (!user) throw httpError(404, "User not found.");
  return statusPayload(user);
}

async function setDigest(userId, enabled) {
  if (typeof enabled !== "boolean") throw httpError(400, "enabled boolean required");
  const current = await lineRepository.findLineIdByUserId(userId);
  if (!current) throw httpError(404, "User not found.");
  if (enabled && !current.lineUserId) throw httpError(400, "Link LINE before enabling digests.");
  const user = await lineRepository.setDigestEnabled(userId, enabled);
  return statusPayload(user);
}

function extractLinkCode(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim().toUpperCase();
  const match = trimmed.match(/^(?:LINK\s+)?([A-Z0-9]{6})$/);
  return match ? match[1] : null;
}

async function handleFollow(event) {
  const lineUserId = event.source?.userId;
  if (!lineUserId || !event.replyToken) return;

  const linked = await lineRepository.findLinkedLineUserId(lineUserId);
  const text = linked
    ? "ยินดีต้อนรับกลับสู่ Torrent\nบัญชี LINE ของคุณเชื่อมอยู่แล้ว — คุณจะได้รับสรุป TOR รายสัปดาห์เมื่อเปิดการแจ้งเตือน"
    : [
        "ยินดีต้อนรับสู่ Torrent Official Account",
        "",
        "ใครก็แอดเพื่อนได้ แต่การแจ้งเตือน TOR ส่งเฉพาะผู้ขายที่เชื่อมบัญชีใน Torrent",
        "",
        "วิธีเชื่อม:",
        "1) เข้าสู่ระบบ Torrent → Smart Alert",
        "2) กด Connect LINE เพื่อรับรหัส 6 ตัว",
        "3) ส่งรหัสนั้นมาที่แชทนี้",
      ].join("\n");

  await lineClient.replyText(event.replyToken, text);
}

async function handleUnfollow(event) {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;

  await lineRepository.clearLineUserId(lineUserId);
  console.log("LINE unfollow cleared link for", lineUserId);
}

async function handleMessage(event) {
  const lineUserId = event.source?.userId;
  if (!lineUserId || !event.replyToken) return;

  const code = extractLinkCode(event.message?.text);
  if (code) {
    const user = await lineRepository.findByValidLinkCode(code, new Date());

    if (!user) {
      await lineClient.replyText(
        event.replyToken,
        "รหัสไม่ถูกต้องหรือหมดอายุแล้ว\nเปิด Smart Alert ใน Torrent แล้วกด Connect LINE เพื่อขอรหัสใหม่",
      );
      return;
    }

    // One LINE account → one Torrent user
    await lineRepository.clearOtherLineLinks(lineUserId, user._id);

    user.lineUserId = lineUserId;
    user.lineDigestEnabled = true;
    user.lineLinkedAt = new Date();
    user.lineLinkCode = undefined;
    user.lineLinkCodeExpiresAt = undefined;
    await lineRepository.save(user);

    await lineClient.replyText(
      event.replyToken,
      "เชื่อมบัญชีสำเร็จ\nคุณจะได้รับสรุป TOR ใหม่ทุกวันจันทร์ 09:00 น.\nปิดได้ทุกเมื่อที่ Smart Alert ใน Torrent",
    );
    console.log("LINE linked", user.email, lineUserId);
    return;
  }

  const linked = await lineRepository.findByLineUserId(lineUserId);
  if (linked) {
    await lineClient.replyText(
      event.replyToken,
      linked.lineDigestEnabled
        ? "บัญชีเชื่อมแล้ว และเปิดสรุปรายสัปดาห์อยู่\nจัดการได้ที่ Smart Alert ใน Torrent"
        : "บัญชีเชื่อมแล้ว แต่ยังปิดสรุปรายสัปดาห์\nเปิดได้ที่ Smart Alert ใน Torrent",
    );
    return;
  }

  await lineClient.replyText(
    event.replyToken,
    "ยังไม่ได้เชื่อมบัญชี Torrent\nเข้า Smart Alert → Connect LINE แล้วส่งรหัส 6 ตัวมาที่นี่",
  );
}

async function processWebhookEvents(events) {
  for (const event of events) {
    try {
      if (event.type === "follow") await handleFollow(event);
      else if (event.type === "unfollow") await handleUnfollow(event);
      else if (event.type === "message" && event.message?.type === "text") {
        await handleMessage(event);
      } else {
        console.log("LINE event", event.type, event.source?.userId);
      }
    } catch (err) {
      console.error("LINE event handler failed", event.type, err.message);
    }
  }
}

module.exports = {
  getStatus,
  startLink,
  unlink,
  setDigest,
  processWebhookEvents,
  verifySignature,
};
