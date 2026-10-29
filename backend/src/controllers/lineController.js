const crypto = require("crypto");
const User = require("@/models/User");
const { replyText } = require("@/services/line/lineClient");

const LINK_CODE_TTL_MS = 15 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function userId(req) {
  return req.user.sub;
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

async function getStatus(req, res) {
  const user = await User.findById(userId(req))
    .select("lineUserId lineDigestEnabled lineLinkedAt lineLinkCode lineLinkCodeExpiresAt")
    .lean();
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  return res.json(statusPayload(user));
}

async function startLink(req, res) {
  const code = makeLinkCode();
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);

  const user = await User.findByIdAndUpdate(
    userId(req),
    {
      lineLinkCode: code,
      lineLinkCodeExpiresAt: expiresAt,
    },
    { returnDocument: "after" },
  ).select("lineUserId lineDigestEnabled lineLinkedAt lineLinkCode lineLinkCodeExpiresAt");

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({
    ...statusPayload(user),
    instructions:
      "Add the Torrent LINE Official Account, then send this code as a message to finish linking.",
  });
}

async function unlink(req, res) {
  const user = await User.findByIdAndUpdate(
    userId(req),
    {
      $unset: { lineUserId: 1, lineLinkCode: 1, lineLinkCodeExpiresAt: 1 },
      lineDigestEnabled: false,
      lineLinkedAt: null,
    },
    { returnDocument: "after" },
  ).select("lineUserId lineDigestEnabled lineLinkedAt lineLinkCode lineLinkCodeExpiresAt");

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json(statusPayload(user));
}

async function setDigest(req, res) {
  const enabled = req.body?.enabled;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "enabled boolean required" });
  }

  const current = await User.findById(userId(req)).select("lineUserId");
  if (!current) {
    return res.status(404).json({ message: "User not found." });
  }
  if (enabled && !current.lineUserId) {
    return res.status(400).json({ message: "Link LINE before enabling digests." });
  }

  const user = await User.findByIdAndUpdate(
    userId(req),
    { lineDigestEnabled: enabled },
    { returnDocument: "after" },
  ).select("lineUserId lineDigestEnabled lineLinkedAt lineLinkCode lineLinkCodeExpiresAt");

  return res.json(statusPayload(user));
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

  const linked = await User.findOne({ lineUserId }).select("_id").lean();
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

  await replyText(event.replyToken, text);
}

async function handleUnfollow(event) {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;

  await User.updateOne(
    { lineUserId },
    {
      $unset: { lineUserId: 1, lineLinkCode: 1, lineLinkCodeExpiresAt: 1 },
      lineDigestEnabled: false,
      lineLinkedAt: null,
    },
  );
  console.log("LINE unfollow cleared link for", lineUserId);
}

async function handleMessage(event) {
  const lineUserId = event.source?.userId;
  if (!lineUserId || !event.replyToken) return;

  const code = extractLinkCode(event.message?.text);
  if (code) {
    const user = await User.findOne({
      lineLinkCode: code,
      lineLinkCodeExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      await replyText(
        event.replyToken,
        "รหัสไม่ถูกต้องหรือหมดอายุแล้ว\nเปิด Smart Alert ใน Torrent แล้วกด Connect LINE เพื่อขอรหัสใหม่",
      );
      return;
    }

    // One LINE account → one Torrent user
    await User.updateMany(
      { lineUserId, _id: { $ne: user._id } },
      {
        $unset: { lineUserId: 1 },
        lineDigestEnabled: false,
        lineLinkedAt: null,
      },
    );

    user.lineUserId = lineUserId;
    user.lineDigestEnabled = true;
    user.lineLinkedAt = new Date();
    user.lineLinkCode = undefined;
    user.lineLinkCodeExpiresAt = undefined;
    await user.save();

    await replyText(
      event.replyToken,
      "เชื่อมบัญชีสำเร็จ\nคุณจะได้รับสรุป TOR ใหม่ทุกวันจันทร์ 09:00 น.\nปิดได้ทุกเมื่อที่ Smart Alert ใน Torrent",
    );
    console.log("LINE linked", user.email, lineUserId);
    return;
  }

  const linked = await User.findOne({ lineUserId }).select("lineDigestEnabled").lean();
  if (linked) {
    await replyText(
      event.replyToken,
      linked.lineDigestEnabled
        ? "บัญชีเชื่อมแล้ว และเปิดสรุปรายสัปดาห์อยู่\nจัดการได้ที่ Smart Alert ใน Torrent"
        : "บัญชีเชื่อมแล้ว แต่ยังปิดสรุปรายสัปดาห์\nเปิดได้ที่ Smart Alert ใน Torrent",
    );
    return;
  }

  await replyText(
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
};
