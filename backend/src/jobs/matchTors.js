const { randomUUID } = require("node:crypto");
const User = require("@/models/User");
const VendorProfile = require("@/models/VendorProfile");
const TOR = require("@/models/TOR");
const TORMatch = require("@/models/TORMatch");
const TorMatchJob = require("@/models/TorMatchJob");
const { matchWithVertex } = require("@/services/tor/matchWithVertex");

const LEASE_MS = Math.max(5 * 60_000, (Number(process.env.VERTEX_MATCH_TIMEOUT_MS) || 60_000) + 60_000);
let draining = false;
let wakeTimer;
let wakeAt = 0;

function minimumMatchPercent() {
  const configured = Number(process.env.VERTEX_MATCH_MIN_PERCENT);
  return Number.isFinite(configured) && configured >= 0 && configured <= 100
    ? configured
    : 60;
}

function queuedTorStatus() {
  return (process.env.VERTEX_MATCH_TOR_STATUS || "published").trim().toLowerCase();
}

function isQueuedTorStatus(status) {
  const configured = queuedTorStatus();
  // Older imported records may not have a lifecycle status. Treat those as
  // eligible so a profile save does not silently skip the legacy catalog.
  return !status || configured === "any" || String(status).trim().toLowerCase() === configured;
}

function eligibleTorFilter() {
  const configured = queuedTorStatus();
  if (configured === "any") return {};
  return {
    $or: [
      { status: configured },
      { status: { $exists: false } },
      { status: null },
    ],
  };
}

async function enqueueTor(torId) {
  return enqueueTors([torId]);
}

async function enqueueTors(torIds = []) {
  const ids = [...new Set(torIds.filter(Boolean).map(String))];
  if (!ids.length) return 0;

  const eligibleTors = await TOR.find({
    _id: { $in: ids },
    ...eligibleTorFilter(),
  }).select("_id").lean();
  const eligibleIds = eligibleTors.map((tor) => String(tor._id));
  if (!eligibleIds.length) return 0;

  await Promise.all(eligibleIds.map((torId) => TorMatchJob.findOneAndUpdate(
    { torId },
    { $inc: { generation: 1 }, $setOnInsert: { status: "pending" } },
    { upsert: true, returnDocument: "after" },
  )));
  await TorMatchJob.updateMany(
    { torId: { $in: eligibleIds }, status: "complete" },
    { $set: { status: "pending", cursor: null, retryAt: null, lastError: null, retryCount: 0 } },
  );
  await TorMatchJob.updateMany(
    { torId: { $in: eligibleIds }, status: "waiting" },
    { $set: { cursor: null } },
  );
  kick();
  return eligibleIds.length;
}

// Jobs are TOR-centric: one job evaluates a TOR against every vendor profile.
// A profile save must therefore requeue the currently eligible TORs instead of
// waiting for a future source sync to update one of them.
async function enqueueEligibleTors() {
  const tors = await TOR.find(eligibleTorFilter()).select("_id").lean();
  return enqueueTors(tors.map((tor) => tor._id));
}

async function claimJob() {
  const now = new Date();
  return TorMatchJob.findOneAndUpdate(
    {
      $or: [
        { status: "pending" },
        { status: "waiting", retryAt: { $lte: now } },
        { status: "running", leaseUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "running",
        lockId: randomUUID(),
        leaseUntil: new Date(Date.now() + LEASE_MS),
        lastError: null,
      },
    },
    { sort: { updatedAt: 1 }, returnDocument: "after" },
  ).lean();
}

async function finishJob(job) {
  const completed = await TorMatchJob.updateOne(
    { _id: job._id, lockId: job.lockId, generation: job.generation },
    {
      $set: {
        status: "complete",
        cursor: null,
        retryAt: null,
        retryCount: 0,
        leaseUntil: null,
        lockId: null,
        completedAt: new Date(),
      },
    },
  );
  if (completed.matchedCount) return;
  // A TOR changed during this pass. Rescan its vendor profiles with current TOR data.
  await TorMatchJob.updateOne(
    { _id: job._id, lockId: job.lockId },
    { $set: { status: "pending", cursor: null, leaseUntil: null, lockId: null } },
  );
}

function rateLimitDelayMs(retryCount) {
  const baseMinutes = Math.max(1, Number(process.env.VERTEX_MATCH_RETRY_MINUTES) || 15);
  const maxMinutes = Math.max(baseMinutes, Number(process.env.VERTEX_MATCH_MAX_RETRY_MINUTES) || 360);
  return Math.min(baseMinutes * (2 ** Math.min(retryCount, 10)), maxMinutes) * 60_000;
}

function pacificParts(date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

function nextPacificMidnight(now = new Date()) {
  const local = pacificParts(now);
  const tomorrow = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
  const targetAsUtc = Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate());
  let target = targetAsUtc;
  // Resolve the Pacific offset at the target date, including daylight saving changes.
  for (let attempt = 0; attempt < 3; attempt++) {
    const atTarget = pacificParts(new Date(target));
    const localAsUtc = Date.UTC(
      atTarget.year,
      atTarget.month - 1,
      atTarget.day,
      atTarget.hour,
      atTarget.minute,
      atTarget.second,
    );
    target = targetAsUtc - (localAsUtc - target);
  }
  return new Date(target);
}

async function waitForVertex(job, code) {
  const dailyQuota = code === "QUOTA_EXHAUSTED" || code === "DAILY_QUOTA_EXHAUSTED";
  const retryCount = Number(job.retryCount) || 0;
  const retryAt = dailyQuota
    ? nextPacificMidnight()
    : new Date(Date.now() + rateLimitDelayMs(retryCount));
  await TorMatchJob.updateOne(
    { _id: job._id, lockId: job.lockId },
    {
      $set: {
        status: "waiting",
        retryAt,
        leaseUntil: null,
        lockId: null,
        lastError: code,
        retryCount: retryCount + 1,
      },
    },
  );
}

async function scheduleNextWake() {
  const [waiting, leased] = await Promise.all([
    TorMatchJob.findOne({ status: "waiting", retryAt: { $ne: null } })
      .sort({ retryAt: 1 }).select("retryAt").lean(),
    TorMatchJob.findOne({ status: "running", leaseUntil: { $ne: null } })
      .sort({ leaseUntil: 1 }).select("leaseUntil").lean(),
  ]);
  const timestamps = [waiting?.retryAt, leased?.leaseUntil]
    .filter(Boolean)
    .map((date) => new Date(date).getTime());
  if (!timestamps.length) {
    if (wakeTimer) clearTimeout(wakeTimer);
    wakeTimer = undefined;
    wakeAt = 0;
    return;
  }

  const timestamp = Math.min(...timestamps);
  if (wakeTimer && wakeAt === timestamp) return;
  if (wakeTimer) clearTimeout(wakeTimer);
  wakeAt = timestamp;
  wakeTimer = setTimeout(() => {
    wakeTimer = undefined;
    wakeAt = 0;
    kick();
  }, Math.min(Math.max(0, timestamp - Date.now()), 2_147_000_000));
  wakeTimer.unref?.();
}

async function advanceCursor(job, userId) {
  const advanced = await TorMatchJob.updateOne(
    { _id: job._id, lockId: job.lockId, status: "running" },
    { $set: { cursor: userId, retryCount: 0, leaseUntil: new Date(Date.now() + LEASE_MS) } },
  );
  return advanced.matchedCount > 0;
}

async function processJob(job) {
  const tor = await TOR.findById(job.torId).lean();
  if (!tor || !isQueuedTorStatus(tor.status)) {
    await finishJob(job);
    return "complete";
  }

  let cursor = job.cursor;
  while (true) {
    const query = { role: "vendor", ...(cursor ? { _id: { $gt: cursor } } : {}) };
    const user = await User.findOne(query).sort({ _id: 1 }).select("_id").lean();
    if (!user) {
      await finishJob(job);
      return "complete";
    }

    const profile = await VendorProfile.findOne({ userId: user._id }).lean();
    if (profile) {
      const result = await matchWithVertex(profile, tor);
      if (!result.ok) {
        await waitForVertex(job, result.code || "UNAVAILABLE");
        console.warn("TOR matching paused", { code: result.code, torId: String(tor._id) });
        return "waiting";
      }

      const stillOwned = await TorMatchJob.exists({
        _id: job._id,
        lockId: job.lockId,
        status: "running",
      });
      if (!stillOwned) return "lost-lease";

      if (result.matchPercent >= minimumMatchPercent()) {
        await TORMatch.updateOne(
          { userId: user._id, torId: tor._id },
          { $set: { matchPercent: result.matchPercent, matchReason: result.matchReason } },
          { upsert: true },
        );
      } else {
        await TORMatch.deleteOne({ userId: user._id, torId: tor._id });
      }
    }

    cursor = user._id;
    if (!await advanceCursor(job, cursor)) return "lost-lease";
  }
}

async function drain() {
  if (draining) return;
  draining = true;
  try {
    let job;
    while ((job = await claimJob())) {
      try {
        const outcome = await processJob(job);
        if (outcome === "waiting") break;
      } catch (error) {
        await waitForVertex(job, "WORKER_ERROR");
        console.error("TOR matching worker failed", {
          torId: String(job.torId),
          message: error.message,
        });
        break;
      }
    }
  } finally {
    draining = false;
    scheduleNextWake().catch((error) => console.error("TOR matching retry schedule failed", error));
  }
}

function kick() {
  setImmediate(() => drain().catch((error) => console.error("TOR matching drain failed", error)));
}

module.exports = {
  drain,
  enqueueTor,
  enqueueTors,
  enqueueEligibleTors,
  kick,
  nextPacificMidnight,
};
