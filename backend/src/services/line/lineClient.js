const LINE_API = "https://api.line.me/v2/bot";

function authHeaders() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN missing");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function postMessage(path, body) {
  const res = await fetch(`${LINE_API}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE ${path} failed ${res.status}: ${text}`);
  }
}

/** Reply in the webhook request thread. Counts toward monthly quota. */
async function replyText(replyToken, text) {
  await postMessage("/message/reply", {
    replyToken,
    messages: [{ type: "text", text }],
  });
}

/** Push 1 message to 1 user. Counts as 1 toward monthly quota. */
async function pushText(lineUserId, text) {
  await postMessage("/message/push", {
    to: lineUserId,
    messages: [{ type: "text", text }],
  });
}

/** How many messages you can still send this month (rough check). */
async function getQuota() {
  const [limitRes, usedRes] = await Promise.all([
    fetch(`${LINE_API}/message/quota`, { headers: authHeaders() }),
    fetch(`${LINE_API}/message/quota/consumption`, { headers: authHeaders() }),
  ]);
  const limit = await limitRes.json();
  const used = await usedRes.json();
  return {
    type: limit.type, // "none" | "limited"
    value: limit.value ?? null,
    totalUsage: used.totalUsage ?? 0,
  };
}

module.exports = { pushText, replyText, getQuota };
