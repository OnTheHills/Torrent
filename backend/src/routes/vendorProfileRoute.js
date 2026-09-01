const express = require("express");
const {
  createVendorProfile,
  getAllVendorProfiles,
  getVendorProfileById,
  updateVendorProfile,
  deleteVendorProfile,
} = require("../controllers/vendorProfileController");

const vendorProfileRouter = express.Router();

vendorProfileRouter.post("/", createVendorProfile);
vendorProfileRouter.get("/", getAllVendorProfiles);
vendorProfileRouter.get("/:id", getVendorProfileById);
vendorProfileRouter.patch("/:id", updateVendorProfile);
vendorProfileRouter.delete("/:id", deleteVendorProfile);

module.exports = vendorProfileRouter;
