const { execFile } = require("node:child_process");
const crypto = require("node:crypto");
const { readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const torRepository = require("@/repositories/torRepository");
const { readPdfText } = require("@/services/tor/ocr/readPdfText");
const { parseAnnouncementBudget } = require("@/utils/torUtils");

const SOURCE = "SME-GP";
const LISTING_ORIGIN = "https://process5.gprocurement.go.th/egp-agpc01-web/announcement/procurement";
const PROJECT_DETAIL_URL =
  "https://process5.gprocurement.go.th/egp-oann10-service/pb/a-egp-allt-project/announcement";
// Public passphrase the e-GP announcement app uses to encode project ids into page URLs.
const LISTING_PASSPHRASE = "RDCrypto";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function isAnnouncementPdf(url) {
  return /view-pdf|\.pdf(?:$|\?)/i.test(String(url || ""));
}

function projectIdFromFilename(name) {
  const match = String(name || "").match(/(?:^|_)(\d{11})(?:_|\.)/);
  return match ? match[1] : "";
}

function evpBytesToKey(password, salt) {
  const passwordBuf = Buffer.from(password, "utf8");
  let previous = Buffer.alloc(0);
  const blocks = [];
  while (Buffer.concat(blocks).length < 48) {
    previous = crypto
      .createHash("md5")
      .update(Buffer.concat([previous, passwordBuf, salt]))
      .digest();
    blocks.push(previous);
  }
  const derived = Buffer.concat(blocks);
  return { key: derived.subarray(0, 32), iv: derived.subarray(32, 48) };
}

// Same OpenSSL salted AES that e-GP's CryptoJS passphrase mode expects.
function encryptListingParam(projectId) {
  const salt = crypto.randomBytes(8);
  const { key, iv } = evpBytesToKey(LISTING_PASSPHRASE, salt);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ projectId: String(projectId) }), "utf8"),
    cipher.final(),
  ]);
  const payload = Buffer.concat([Buffer.from("Salted__"), salt, encrypted]).toString("base64");
  return encodeURIComponent(payload);
}

function decryptListingParam(param) {
  const payload = Buffer.from(decodeURIComponent(param), "base64");
  const salt = payload.subarray(8, 16);
  const { key, iv } = evpBytesToKey(LISTING_PASSPHRASE, salt);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const json = Buffer.concat([decipher.update(payload.subarray(16)), decipher.final()]).toString("utf8");
  return JSON.parse(json);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function listingUrl(projectId) {
  if (!projectId) return "";
  return `${LISTING_ORIGIN}/${encryptListingParam(projectId)}`;
}

function projectIdFromListing(url) {
  const match = String(url || "").match(/\/announcement\/procurement\/([^/?#]+)/);
  if (!match) return "";
  try {
    return String(decryptListingParam(match[1]).projectId || "");
  } catch {
    return "";
  }
}

// e-GP's invitation step stays on the record after a winner or a cancellation.
// The live project step is what the card should show.
function stageFromEgp({ flowName, projectStatus, announceType } = {}) {
  const flow = String(flowName || "");
  const status = String(projectStatus || "").toUpperCase();
  const announce = String(announceType || "").toUpperCase();
  if (status === "R" || /ยกเลิก|ล้มเลิก/.test(flow)) return "cancelled";
  if (/ผู้ชนะ|สัญญา|อนุมัติสั่งซื้อสั่งจ้าง/.test(flow) || announce.startsWith("W")) {
    return "awarded";
  }
  return "published";
}

function filenameFromDisposition(header) {
  const value = String(header || "");
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) return decodeURIComponent(encoded[1].trim().replace(/"/g, ""));
  const plain = value.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : "";
}

async function fetchEgp(url, accept) {
  const response = await fetch(url, {
    headers: { Accept: accept, "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  return response;
}

async function fetchEgpJson(url) {
  const response = await fetchEgp(url, "application/json");
  const body = await response.text();
  if (!response.ok || body.trim().startsWith("<")) {
    const error = new Error("e-GP rejected the project status request");
    error.code = "waf";
    throw error;
  }
  return JSON.parse(body);
}

async function projectIdFromPdfHeaders(pdfUrl) {
  const response = await fetch(pdfUrl, {
    method: "HEAD",
    headers: { Accept: "application/pdf,*/*", "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  const filename = filenameFromDisposition(response.headers.get("content-disposition"));
  return projectIdFromFilename(filename);
}

async function egpStage(projectId) {
  const [detail, procurement] = await Promise.all([
    fetchEgpJson(`${PROJECT_DETAIL_URL}/getProjectDetail?projectId=${projectId}`),
    fetchEgpJson(`${PROJECT_DETAIL_URL}/getProcurementDetail?projectId=${projectId}`),
  ]);
  return stageFromEgp({
    flowName: procurement.data?.flowName,
    projectStatus: detail.data?.projectStatus,
    announceType: detail.data?.announceType,
  });
}

async function downloadAnnouncement(pdfUrl) {
  // e-GP rejects Node's fetch fingerprint and returns an HTML block page.
  // curl is accepted and returns the announcement PDF.
  const id = crypto.randomBytes(8).toString("hex");
  const bodyPath = join(tmpdir(), `torrent-announcement-${id}.pdf`);
  const headerPath = join(tmpdir(), `torrent-announcement-${id}.hdr`);
  try {
    await execFileAsync(
      "curl",
      [
        "-sS",
        "-L",
        "--max-time",
        "40",
        "-A",
        USER_AGENT,
        "-H",
        "Accept: application/pdf,*/*",
        "-D",
        headerPath,
        "-o",
        bodyPath,
        pdfUrl,
      ],
      { timeout: 45000 },
    );
    const bytes = await readFile(bodyPath);
    if (bytes.subarray(0, 5).toString() !== "%PDF-") {
      const error = new Error("e-GP rejected the PDF download");
      error.code = "waf";
      throw error;
    }
    const headers = await readFile(headerPath, "utf8");
    const filename = filenameFromDisposition(headers);
    return { bytes, projectId: projectIdFromFilename(filename) };
  } finally {
    await rm(bodyPath, { force: true });
    await rm(headerPath, { force: true });
  }
}

async function readAnnouncement(pdfUrl) {
  const { bytes, projectId } = await downloadAnnouncement(pdfUrl);
  const text = await readPdfText(bytes);
  const budgetThb = parseAnnouncementBudget(text);
  return {
    budgetThb: budgetThb || undefined,
    listingUrl: listingUrl(projectId),
    projectId,
  };
}

function pdfUrlOf(tor) {
  if (tor.torPdfPath) return tor.torPdfPath;
  return isAnnouncementPdf(tor.egpUrl) ? tor.egpUrl : "";
}

function alreadyRead(current, pdfUrl) {
  return Boolean(
    current &&
      current.budgetThb > 0 &&
      current.egpUrl &&
      !isAnnouncementPdf(current.egpUrl) &&
      current.torPdfPath === pdfUrl,
  );
}

async function mapPool(items, limit, worker) {
  let index = 0;
  let stopped = false;
  async function run() {
    while (!stopped && index < items.length) {
      const current = index++;
      const keepGoing = await worker(items[current], current);
      if (keepGoing === false) stopped = true;
    }
  }
  const width = Math.min(limit, items.length);
  if (width > 0) {
    await Promise.all(Array.from({ length: width }, () => run()));
  }
  return stopped;
}

async function projectIdFor(row) {
  const fromListing = projectIdFromListing(row.egpUrl);
  if (fromListing) return fromListing;
  const fromName = projectIdFromFilename(row.torPdfPath);
  if (fromName) return fromName;
  const pdfUrl = pdfUrlOf(row);
  if (!pdfUrl) return "";
  return projectIdFromPdfHeaders(pdfUrl);
}

// SME-GP notices are stored as published invitations. Ask e-GP whether that
// project has since been awarded or cancelled, and keep the card in step.
async function refreshStages() {
  const rows = await torRepository.findBySource(SOURCE);
  const summary = {
    stageChecked: 0,
    stageAwarded: 0,
    stageCancelled: 0,
    stageOpen: 0,
    stageUnchanged: 0,
    stageFailed: 0,
  };

  const stopped = await mapPool(rows, 1, async (row) => {
    summary.stageChecked++;
    if (row.status === "awarded" || row.status === "cancelled") {
      summary.stageUnchanged++;
      return;
    }
    await wait(400);
    let status;
    try {
      const projectId = await projectIdFor(row);
      if (!projectId) {
        summary.stageFailed++;
        return;
      }
      status = await egpStage(projectId);
    } catch (error) {
      summary.stageFailed++;
      console.error(`SME stage ${row.refId}: ${error.message}`);
      if (error.code === "waf") return false;
      return;
    }
    if (status === "awarded") summary.stageAwarded++;
    else if (status === "cancelled") summary.stageCancelled++;
    else summary.stageOpen++;
    if (row.status === status) summary.stageUnchanged++;
    else await torRepository.update(row._id, { status });
    if (summary.stageChecked % 50 === 0) {
      console.log(`SME stages checked ${summary.stageChecked}/${rows.length}`);
    }
  });

  return summary;
}

// Fill budget and the e-GP listing URL from announcement PDFs already stored for SME-GP.
// Downloads stay sequential. One rejection gets a pause and a retry; a second rejection
// stops the run so a block is not extended.
async function enrichStored() {
  const rows = await torRepository.findBySource(SOURCE);
  const summary = {
    announcementRead: 0,
    announcementUpdated: 0,
    announcementSkipped: 0,
    announcementFailed: 0,
  };

  const pending = rows.filter((row) => {
    const pdfUrl = pdfUrlOf(row);
    return pdfUrl && !alreadyRead(row, pdfUrl);
  });
  summary.announcementSkipped = rows.length - pending.length;

  await mapPool(pending, 1, async (row) => {
    const pdfUrl = pdfUrlOf(row);
    summary.announcementRead++;
    await wait(700);
    try {
      const read = await readAnnouncement(pdfUrl);
      const update = { torPdfPath: pdfUrl };
      if (read.budgetThb) update.budgetThb = read.budgetThb;
      if (read.listingUrl) update.egpUrl = read.listingUrl;
      if (!read.budgetThb && !read.listingUrl) {
        summary.announcementFailed++;
        console.error(`SME announcement ${row.refId}: PDF had no budget`);
        return;
      }
      const changed = Object.entries(update).some(([field, value]) => row[field] !== value);
      if (!changed) {
        summary.announcementSkipped++;
        return;
      }
      await torRepository.update(row._id, update);
      summary.announcementUpdated++;
      if (summary.announcementUpdated % 25 === 0) {
        console.log(`SME announcement updated ${summary.announcementUpdated}`);
      }
    } catch (error) {
      if (error.code === "waf") {
        await wait(30000);
        try {
          const read = await readAnnouncement(pdfUrl);
          const update = { torPdfPath: pdfUrl };
          if (read.budgetThb) update.budgetThb = read.budgetThb;
          if (read.listingUrl) update.egpUrl = read.listingUrl;
          if (read.budgetThb || read.listingUrl) {
            await torRepository.update(row._id, update);
            summary.announcementUpdated++;
            return;
          }
          summary.announcementFailed++;
          console.error(`SME announcement ${row.refId}: PDF had no budget`);
          return;
        } catch (retryError) {
          summary.announcementFailed++;
          console.error(`SME announcement ${row.refId}: ${retryError.message}`);
          if (retryError.code === "waf") return false;
          return;
        }
      }
      summary.announcementFailed++;
      console.error(`SME announcement ${row.refId}: ${error.message}`);
    }
  });

  return summary;
}

module.exports = {
  alreadyRead,
  decryptListingParam,
  downloadAnnouncement,
  enrichStored,
  encryptListingParam,
  isAnnouncementPdf,
  listingUrl,
  pdfUrlOf,
  projectIdFromFilename,
  projectIdFromListing,
  readAnnouncement,
  refreshStages,
  stageFromEgp,
};
