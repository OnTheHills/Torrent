const express = require("express");
const {
  createVendorProfile,
  getAllVendorProfiles,
  getVendorProfileById,
  getVendorProfileByUserId,
  updateVendorProfile,
  deleteVendorProfile,
} = require("@/controllers/vendorProfileController");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireSelfOrAdminByUserId } = require("@/middleware/requireRole");

const vendorProfileRouter = express.Router();

vendorProfileRouter.post("/", createVendorProfile);
vendorProfileRouter.get("/", getAllVendorProfiles);
vendorProfileRouter.get("/get/:userId", requireAuth, requireSelfOrAdminByUserId, getVendorProfileByUserId);
vendorProfileRouter.get("/:id", getVendorProfileById);
vendorProfileRouter.patch("/:id", updateVendorProfile);
vendorProfileRouter.delete("/:id", deleteVendorProfile);

module.exports = vendorProfileRouter;
