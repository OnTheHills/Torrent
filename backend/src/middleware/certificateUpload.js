const { CERTIFICATE_FIELDS, MAX_CERTIFICATES, MAX_FILE_SIZE, badRequest } = require("@/services/vendor/certificateStorage");

const MAX_PROFILE_SIZE = 1024 * 1024;
const MAX_UPLOAD_SIZE = MAX_FILE_SIZE * MAX_CERTIFICATES * Object.keys(CERTIFICATE_FIELDS).length + MAX_PROFILE_SIZE;

async function readForm(request) {
  if (Number(request.headers["content-length"]) > MAX_UPLOAD_SIZE) {
    throw badRequest("Certificate upload is too large.", 413);
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_UPLOAD_SIZE) throw badRequest("Certificate upload is too large.", 413);
    chunks.push(chunk);
  }
  try {
    return await new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": request.headers["content-type"] },
      body: Buffer.concat(chunks),
    }).formData();
  } catch {
    throw badRequest("Malformed certificate upload.");
  }
}

function readProfile(form) {
  const profiles = form.getAll("profile");
  if (profiles.length !== 1 || typeof profiles[0] !== "string" || Buffer.byteLength(profiles[0]) > MAX_PROFILE_SIZE) {
    throw badRequest("Provide one profile JSON field.");
  }
  try {
    return JSON.parse(profiles[0]);
  } catch {
    throw badRequest("Invalid profile JSON.");
  }
}

async function readFiles(form) {
  const result = {};
  for (const [field, file] of form.entries()) {
    if (field === "profile") continue;
    if (!Object.hasOwn(CERTIFICATE_FIELDS, field) || typeof file === "string") {
      throw badRequest("Unknown certificate upload field.");
    }
    const files = result[field] ||= [];
    if (files.length >= MAX_CERTIFICATES) throw badRequest("Choose at most 5 certificates per category.");
    if (file.size > MAX_FILE_SIZE) throw badRequest("Each certificate must be no larger than 5 MB.", 413);
    files.push({ name: file.name, type: file.type, buffer: Buffer.from(await file.arrayBuffer()) });
  }
  return result;
}

async function certificateUpload(request, response, next) {
  if (!request.is("multipart/form-data")) return next();
  try {
    const form = await readForm(request);
    request.body = readProfile(form);
    request.certificateFiles = await readFiles(form);
    return next();
  } catch (error) {
    return response.status(error.status || 400).json({ message: error.message });
  }
}

module.exports = { certificateUpload };
