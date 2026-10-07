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

const SOURCE_TIME_ZONE = "Asia/Bangkok";

function bangkokDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SOURCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Same stages the listing cards call open, closing soon, and draft.
// Awarded, cancelled, and past-deadline notices are not scored.
function fitScoreApplies(tor, today = bangkokDateString()) {
  if (!tor) return false;
  const status = String(tor.status || "").trim().toLowerCase();
  if (status === "awarded" || status === "cancelled") return false;
  if (!status || status === "draft") return true;
  if (!isQueuedTorStatus(tor.status)) return false;
  const deadline = tor.deadline || tor.ocr?.deadline;
  if (!deadline) return true;
  const deadlineDay = bangkokDateString(new Date(deadline));
  return deadlineDay >= today;
}

function scoreableStatusFilter() {
  const configured = queuedTorStatus();
  if (configured === "any") return {};
  return {
    $or: [
      { status: configured },
      { status: "draft" },
      { status: { $exists: false } },
      { status: null },
      { status: "" },
    ],
  };
}

async function findScoreableTors(ids) {
  const query = { ...scoreableStatusFilter() };
  if (ids) query._id = { $in: ids };
  const tors = await TOR.find(query).select("_id status deadline ocr.deadline").lean();
  return tors.filter((tor) => fitScoreApplies(tor));
}

async function enqueueTor(torId) {
  return enqueueTors([torId]);
}

async function enqueueTors(torIds = []) {
  const ids = [...new Set(torIds.filter(Boolean).map(String))];
  if (!ids.length) return 0;

  const eligibleIds = (await findScoreableTors(ids)).map((tor) => String(tor._id));
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
  const tors = await findScoreableTors();
  return enqueueTors(tors.map((tor) => tor._id));
}

async function retireIneligibleJobs() {
  const active = await TorMatchJob.find({
    status: { $in: ["pending", "running", "waiting"] },
  }).select("_id torId").lean();
  if (!active.length) return 0;

  const tors = await TOR.find({ _id: { $in: active.map((job) => job.torId) } })
    .select("_id status deadline ocr.deadline")
    .lean();
  const scoreable = new Set(
    tors.filter((tor) => fitScoreApplies(tor)).map((tor) => String(tor._id)),
  );
  const dropIds = active
    .filter((job) => !scoreable.has(String(job.torId)))
    .map((job) => job._id);
  if (!dropIds.length) return 0;

  await TorMatchJob.updateMany(
    { _id: { $in: dropIds } },
    {
      $set: {
        status: "complete",
        cursor: null,
        retryAt: null,
        retryCount: 0,
        leaseUntil: null,
        lockId: null,
        lastError: null,
        completedAt: new Date(),
      },
    },
  );
  console.info("TOR matching skipped closed, awarded, and cancelled listings", {
    jobs: dropIds.length,
  });
  return dropIds.length;
}

async function claimJob() {
  const now = new Date();
  const eligible = {
    $or: [
      { status: "pending" },
      { status: "waiting", retryAt: { $lte: now } },
      { status: "running", leaseUntil: { $lte: now } },
    ],
  };
  const candidates = await TorMatchJob.find(eligible).select("_id torId").lean();
  if (!candidates.length) return null;

  const tors = await TOR.find({ _id: { $in: candidates.map((job) => job.torId) } })
    .select("publishedAt")
    .lean();
  const publishedAt = new Map(
    tors.map((tor) => [
      String(tor._id),
      tor.publishedAt ? new Date(tor.publishedAt).getTime() : 0,
    ]),
  );
  candidates.sort(
    (a, b) => (publishedAt.get(String(b.torId)) || 0) - (publishedAt.get(String(a.torId)) || 0),
  );

  const claim = {
    $set: {
      status: "running",
      lockId: randomUUID(),
      leaseUntil: new Date(Date.now() + LEASE_MS),
      lastError: null,
    },
  };
  for (const candidate of candidates) {
    const claimed = await TorMatchJob.findOneAndUpdate(
      { _id: candidate._id, ...eligible },
      claim,
      { returnDocument: "after" },
    ).lean();
    if (claimed) return claimed;
  }
  return null;
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
  if (!tor || !fitScoreApplies(tor)) {
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
    await retireIneligibleJobs();
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
  fitScoreApplies,
  kick,
  nextPacificMidnight,
};
