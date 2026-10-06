const { execFile } = require("node:child_process");
const crypto = require("node:crypto");
const { readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const { SOURCE } = require("@/constants/smeGpConstants");
const torRepository = require("@/repositories/torRepository");
const { readPdfText } = require("@/services/tor/ocr/readPdfText");
const { parseAnnouncementBudget } = require("@/utils/torUtils");

const LISTING_ORIGIN = "https://process5.gprocurement.go.th/egp-agpc01-web/announcement/procurement";
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

function listingUrl(projectId) {
  if (!projectId) return "";
  return `${LISTING_ORIGIN}/${encryptListingParam(projectId)}`;
}

function filenameFromDisposition(header) {
  const value = String(header || "");
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) return decodeURIComponent(encoded[1].trim().replace(/"/g, ""));
  const plain = value.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : "";
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

// Fill budget and the e-GP listing URL from the announcement PDF before save.
// Records that already have both are copied forward so a later sync does not wipe them.
async function enrich(tors = []) {
  const summary = {
    announcementRead: 0,
    announcementUpdated: 0,
    announcementSkipped: 0,
    announcementFailed: 0,
  };
  const existing = await torRepository.findBySource(SOURCE);
  const byRef = new Map(existing.map((row) => [row.refId, row]));
  let blocked = 0;

  await mapPool(tors, 2, async (tor) => {
    const pdfUrl = pdfUrlOf(tor);
    if (!pdfUrl) {
      summary.announcementSkipped++;
      return;
    }
    tor.torPdfPath = pdfUrl;
    if (isAnnouncementPdf(tor.egpUrl)) tor.egpUrl = undefined;

    const current = byRef.get(tor.refId);
    if (alreadyRead(current, pdfUrl)) {
      tor.budgetThb = current.budgetThb;
      tor.egpUrl = current.egpUrl;
      summary.announcementSkipped++;
      return;
    }

    summary.announcementRead++;
    try {
      const read = await readAnnouncement(pdfUrl);
      if (read.budgetThb) tor.budgetThb = read.budgetThb;
      else if (current?.budgetThb) tor.budgetThb = current.budgetThb;
      if (read.listingUrl) tor.egpUrl = read.listingUrl;
      else if (current?.egpUrl && !isAnnouncementPdf(current.egpUrl)) tor.egpUrl = current.egpUrl;
      summary.announcementUpdated++;
    } catch (error) {
      summary.announcementFailed++;
      if (current?.budgetThb) tor.budgetThb = current.budgetThb;
      if (current?.egpUrl && !isAnnouncementPdf(current.egpUrl)) tor.egpUrl = current.egpUrl;
      if (error.code === "waf" && ++blocked >= 3) return false;
      console.error(`SME announcement ${tor.refId}: ${error.message}`);
    }
  });

  return summary;
}

// Backfill rows already stored from SME-GP, whose link was saved as the PDF.
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
  let blocked = 0;

  await mapPool(pending, 2, async (row) => {
    const pdfUrl = pdfUrlOf(row);
    summary.announcementRead++;
    try {
      const read = await readAnnouncement(pdfUrl);
      const update = { torPdfPath: pdfUrl };
      if (read.budgetThb) update.budgetThb = read.budgetThb;
      if (read.listingUrl) update.egpUrl = read.listingUrl;
      if (!read.budgetThb && !read.listingUrl) {
        summary.announcementFailed++;
        return;
      }
      await torRepository.update(row._id, update);
      summary.announcementUpdated++;
    } catch (error) {
      summary.announcementFailed++;
      if (error.code === "waf" && ++blocked >= 3) return false;
      console.error(`SME announcement ${row.refId}: ${error.message}`);
    }
  });

  return summary;
}

module.exports = {
  decryptListingParam,
  downloadAnnouncement,
  enrich,
  enrichStored,
  encryptListingParam,
  isAnnouncementPdf,
  listingUrl,
  projectIdFromFilename,
  readAnnouncement,
};
