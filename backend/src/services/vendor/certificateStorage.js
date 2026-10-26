const path = require("node:path");
const fs = require("node:fs/promises");
const { constants } = require("node:fs");
const { validateCertificatePng } = require("@/utils/certificatePng");

const UPLOAD_DIRECTORY = path.resolve(process.env.CERTIFICATE_UPLOAD_DIR || path.join(__dirname, "../../../upload"));
const CERTIFICATE_FIELDS = {
  securityCertificates: "security",
  aiCertificates: "ai",
  otherCertificates: "other",
};
const MAX_CERTIFICATES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const FILE_PATTERN = /^\d+_(security|ai|other)_[a-f0-9]{24}\.png$/;

function badRequest(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function retainedCertificates(data, existing) {
  const result = {};
  for (const field of Object.keys(CERTIFICATE_FIELDS)) {
    const paths = data[field] ?? existing?.[field] ?? [];
    if (!Array.isArray(paths) || paths.length > MAX_CERTIFICATES ||
        paths.some((value) => typeof value !== "string" || !existing?.[field]?.includes(value)) ||
        new Set(paths).size !== paths.length) {
      throw badRequest(`${field} must contain only existing certificate paths belonging to this profile.`);
    }
    result[field] = [...paths];
  }
  return result;
}

async function removeCertificateFiles(paths) {
  await Promise.all(paths.map(async (storedPath) => {
    const filename = storedPath.startsWith("upload/") ? storedPath.slice(7) : "";
    if (!FILE_PATTERN.test(filename)) return;
    try {
      await fs.unlink(path.join(UPLOAD_DIRECTORY, filename));
    } catch (error) {
      if (error.code !== "ENOENT") console.error("Unable to clean up certificate:", error.message);
    }
  }));
}

let lastTimestamp = 0;
async function writeCertificate(file, category, userId) {
  // Exclusive creation and a monotonic millisecond timestamp prevent overwrites.
  for (;;) {
    const timestamp = Math.max(Date.now(), lastTimestamp + 1);
    lastTimestamp = timestamp;
    const filename = `${timestamp}_${category}_${userId}.png`;
    try {
      await fs.writeFile(path.join(UPLOAD_DIRECTORY, filename), file.buffer, { flag: "wx", mode: 0o600 });
      return `upload/${filename}`;
    } catch (error) {
      if (error.code !== "EEXIST") {
        // A failed write can still have created a partial file.
        await removeCertificateFiles([`upload/${filename}`]);
        throw error;
      }
    }
  }
}

function validateUploads(files, paths) {
  for (const [field, uploads] of Object.entries(files)) {
    if (!Object.hasOwn(CERTIFICATE_FIELDS, field) || !Array.isArray(uploads)) throw badRequest("Unknown certificate category.");
    if (paths[field].length + uploads.length > MAX_CERTIFICATES) throw badRequest("Choose at most 5 certificates per category.");
    for (const file of uploads) {
      if (!/\.png$/i.test(file.name) || file.type !== "image/png") throw badRequest("Only PNG certificate images are accepted.");
      if (file.buffer.length > MAX_FILE_SIZE) throw badRequest("Each certificate must be no larger than 5 MB.", 413);
      try {
        validateCertificatePng(file.buffer);
      } catch (error) {
        throw badRequest(error.message);
      }
    }
  }
}

async function writeUploads(files, paths, userId, written) {
  if (!Object.values(files).some((uploads) => uploads.length)) return;

  // No upload directory needs to exist in the repository.
  await fs.mkdir(UPLOAD_DIRECTORY, { recursive: true });
  for (const [field, uploads] of Object.entries(files)) {
    for (const file of uploads) {
      const storedPath = await writeCertificate(file, CERTIFICATE_FIELDS[field], userId);
      written.push(storedPath);
      paths[field].push(storedPath);
    }
  }
}

async function saveCertificates({ data, existing, files = {}, userId, persist }) {
  userId = String(userId);
  if (!/^[a-f0-9]{24}$/.test(userId)) throw badRequest("Invalid profile owner.");

  const paths = retainedCertificates(data, existing);
  validateUploads(files, paths);
  const written = [];
  let profile;
  try {
    await writeUploads(files, paths, userId, written);
    profile = await persist({ ...data, userId, ...paths });
    if (!profile) throw badRequest("Vendor profile not found.", 404);
  } catch (error) {
    await removeCertificateFiles(written);
    throw error;
  }
  const removed = Object.keys(CERTIFICATE_FIELDS).flatMap((field) =>
    (existing?.[field] ?? []).filter((storedPath) => !paths[field].includes(storedPath)));
  await removeCertificateFiles(removed);
  return profile;
}

async function readCertificates(profile) {
  const userId = String(profile.userId || "");
  if (!/^[a-f0-9]{24}$/.test(userId)) return [];

  const certificates = [];
  const seen = new Set();
  for (const [field, category] of Object.entries(CERTIFICATE_FIELDS)) {
    const paths = Array.isArray(profile[field]) ? profile[field] : [];
    for (const storedPath of paths.slice(0, MAX_CERTIFICATES)) {
      if (typeof storedPath !== "string") continue;
      const filename = storedPath.slice("upload/".length);
      if (storedPath !== `upload/${filename}` || !FILE_PATTERN.test(filename) ||
          !filename.endsWith(`_${category}_${userId}.png`) || seen.has(filename)) continue;
      seen.add(filename);

      let file;
      try {
        // Only read this profile's registered files; never follow a symlink.
        file = await fs.open(path.join(UPLOAD_DIRECTORY, filename), constants.O_RDONLY | constants.O_NOFOLLOW);
        const stat = await file.stat();
        if (!stat.isFile() || stat.size > MAX_FILE_SIZE) throw new Error("Invalid certificate file");
        const buffer = await file.readFile();
        validateCertificatePng(buffer);
        certificates.push({ category, buffer });
      } catch (error) {
        console.warn("Certificate unavailable for matching", { category, code: error.code || "INVALID_PNG" });
      } finally {
        await file?.close();
      }
    }
  }
  return certificates;
}

module.exports = { CERTIFICATE_FIELDS, FILE_PATTERN, MAX_CERTIFICATES, MAX_FILE_SIZE, UPLOAD_DIRECTORY, badRequest, saveCertificates, readCertificates };
