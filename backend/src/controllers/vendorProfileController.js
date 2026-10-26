const vendorProfileService = require("@/services/vendor/vendorProfileService");
const { badRequest, CERTIFICATE_FIELDS, FILE_PATTERN, UPLOAD_DIRECTORY } = require("@/services/vendor/certificateStorage");

function profileData(request) {
  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) throw badRequest("Provide a profile object.");
  if (body.userId && String(body.userId) !== String(request.vendorProfile?.userId || request.user.sub)) {
    throw badRequest("You cannot change the profile owner.", 403);
  }
  const allowed = ["companyName", "companyEmail", "vendorCapDescription", "teamSize", "techSkills",
    "pastProjects", "website", "companyPhone", "bio", "location",
    "securityCertificates", "aiCertificates", "otherCertificates"];
  return Object.fromEntries(allowed.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));
}

function saveError(response, error) {
  const status = error.status || (error.name === "ValidationError" ? 400 : error.code === 11000 ? 409 : 500);
  return response.status(status).json({ message: error.message });
}

async function createVendorProfile(request, response) {
  try {
    const vendorProfile = await vendorProfileService.createVendorProfile(
      { ...profileData(request), userId: request.user.sub }, request.certificateFiles,
    );
    return response.status(201).json(vendorProfile);
  } catch (error) {
    return saveError(response, error);
  }
}

async function getAllVendorProfiles(request, response) {
  try {
    const vendorProfiles = await vendorProfileService.getAllVendorProfiles();
    return response.status(200).json(vendorProfiles);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getVendorProfileById(request, response) {
  try {
    const vendorProfile = await vendorProfileService.getVendorProfileById(
      request.params.id,
    );

    if (!vendorProfile) {
      return response.status(404).json({ message: "Vendor profile not found." });
    }

    return response.status(200).json(vendorProfile);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getVendorProfileByUserId(request, response) {
  try {
    const vendorProfile = await vendorProfileService.getVendorProfileByUserId(
      request.params.userId,
    );

    if (!vendorProfile) {
      return response.status(404).json({ message: "Vendor profile not found." });
    }

    return response.status(200).json(vendorProfile);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function updateVendorProfile(request, response) {
  try {
    const vendorProfile = await vendorProfileService.updateVendorProfile(
      request.params.id,
      profileData(request),
      request.certificateFiles,
      request.vendorProfile,
    );

    if (!vendorProfile) {
      return response.status(404).json({ message: "Vendor profile not found." });
    }

    return response.status(200).json(vendorProfile);
  } catch (error) {
    return saveError(response, error);
  }
}

async function deleteVendorProfile(request, response) {
  try {
    const vendorProfile = await vendorProfileService.deleteVendorProfile(
      request.params.id,
    );

    if (!vendorProfile) {
      return response.status(404).json({ message: "Vendor profile not found." });
    }

    return response.status(200).json(vendorProfile);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getCertificate(request, response) {
  const { filename } = request.params;
  if (!FILE_PATTERN.test(filename)) return response.status(404).json({ message: "Certificate not found." });
  const [, , ownerId] = filename.slice(0, -4).split("_");
  if (ownerId !== request.user.sub && request.user.role !== "admin") return response.status(403).json({ message: "Forbidden." });
  try {
    const profile = await vendorProfileService.getVendorProfileByUserId(ownerId);
    if (!profile || !Object.keys(CERTIFICATE_FIELDS).some((field) => profile[field]?.includes(`upload/${filename}`))) {
      return response.status(404).json({ message: "Certificate not found." });
    }
    response.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    return response.sendFile(filename, { root: UPLOAD_DIRECTORY }, (error) => {
      if (error && !response.headersSent) response.status(error.statusCode === 404 ? 404 : 500).json({ message: "Unable to open certificate." });
    });
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

module.exports = {
  getCertificate,
  createVendorProfile,
  getAllVendorProfiles,
  getVendorProfileById,
  getVendorProfileByUserId,
  updateVendorProfile,
  deleteVendorProfile,
};
