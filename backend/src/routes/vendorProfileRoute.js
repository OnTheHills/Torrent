const express = require("express");
const {
  createVendorProfile,
  getCertificate,
  getAllVendorProfiles,
  getVendorProfileById,
  getVendorProfileByUserId,
  updateVendorProfile,
  deleteVendorProfile,
} = require("@/controllers/vendorProfileController");
const { requireAuth } = require("@/middleware/requireAuth");
const { requireSelfOrAdminByUserId } = require("@/middleware/requireRole");
const { requireVendorProfileOwner } = require("@/middleware/requireVendorProfileOwner");
const { certificateUpload } = require("@/middleware/certificateUpload");

const vendorProfileRouter = express.Router();

vendorProfileRouter.post("/", requireAuth, certificateUpload, createVendorProfile);
vendorProfileRouter.get("/", getAllVendorProfiles);
vendorProfileRouter.get("/certificates/:filename", requireAuth, getCertificate);
vendorProfileRouter.get("/get/:userId", requireAuth, requireSelfOrAdminByUserId, getVendorProfileByUserId);
vendorProfileRouter.get("/:id", getVendorProfileById);
vendorProfileRouter.patch("/:id", requireAuth, requireVendorProfileOwner, certificateUpload, updateVendorProfile);
vendorProfileRouter.delete("/:id", requireAuth, requireVendorProfileOwner, deleteVendorProfile);

module.exports = vendorProfileRouter;
