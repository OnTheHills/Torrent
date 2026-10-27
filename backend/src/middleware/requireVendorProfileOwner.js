const vendorProfiles = require("@/repositories/vendorProfileRepository");

async function requireVendorProfileOwner(request, response, next) {
  if (!/^[a-f0-9]{24}$/i.test(request.params.id)) return response.status(400).json({ message: "Invalid profile ID." });
  try {
    const profile = await vendorProfiles.findById(request.params.id);
    if (!profile) return response.status(404).json({ message: "Vendor profile not found." });
    if (String(profile.userId) !== request.user.sub && request.user.role !== "admin") {
      return response.status(403).json({ message: "Forbidden." });
    }
    request.vendorProfile = profile;
    return next();
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

module.exports = { requireVendorProfileOwner };
