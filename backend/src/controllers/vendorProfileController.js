const VendorProfile = require("../models/VendorProfile");

async function createVendorProfile(request, response) {
  try {
    const vendorProfile = await VendorProfile.create(request.body);
    return response.status(201).json(vendorProfile);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getAllVendorProfiles(request, response) {
  try {
    const vendorProfiles = await VendorProfile.find();
    return response.status(200).json(vendorProfiles);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getVendorProfileById(request, response) {
  try {
    const vendorProfile = await VendorProfile.findById(request.params.id);

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
    const vendorProfile = await VendorProfile.findByIdAndUpdate(
      request.params.id,
      request.body,
      { returnDocument: "after", runValidators: true },
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
    const vendorProfile = await VendorProfile.findByIdAndDelete(request.params.id);

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
