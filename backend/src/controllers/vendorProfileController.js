const vendorProfileService = require("@/services/vendor/vendorProfileService");

async function createVendorProfile(request, response) {
  try {
    const vendorProfile = await vendorProfileService.createVendorProfile(request.body);
    return response.status(201).json(vendorProfile);
  } catch (error) {
    return response.status(500).json({ message: error.message });
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

async function updateVendorProfile(request, response) {
  try {
    const vendorProfile = await vendorProfileService.updateVendorProfile(
      request.params.id,
      request.body,
    );

    if (!vendorProfile) {
      return response.status(404).json({ message: "Vendor profile not found." });
    }

    return response.status(200).json(vendorProfile);
  } catch (error) {
    return response.status(500).json({ message: error.message });
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

module.exports = {
  createVendorProfile,
  getAllVendorProfiles,
  getVendorProfileById,
  updateVendorProfile,
  deleteVendorProfile,
};
