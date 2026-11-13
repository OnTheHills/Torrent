const path = require("node:path");

const UPLOAD_DIRECTORY = path.resolve(process.env.CERTIFICATE_UPLOAD_DIR || path.join(__dirname, "../../upload"));
const CERTIFICATE_FIELDS = {
  securityCertificates: "security",
  aiCertificates: "ai",
  otherCertificates: "other",
};
const MAX_CERTIFICATES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PROFILE_SIZE = 1024 * 1024;
const MAX_UPLOAD_SIZE = MAX_FILE_SIZE * MAX_CERTIFICATES * Object.keys(CERTIFICATE_FIELDS).length + MAX_PROFILE_SIZE;
const FILE_PATTERN = /^\d+_(security|ai|other)_[a-f0-9]{24}\.png$/;

module.exports = {
  UPLOAD_DIRECTORY, CERTIFICATE_FIELDS, MAX_CERTIFICATES, MAX_FILE_SIZE,
  MAX_PROFILE_SIZE, MAX_UPLOAD_SIZE, FILE_PATTERN,
};
