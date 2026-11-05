const VendorProfile = require("@/models/VendorProfile");

// Run before serving requests so lean reads also use the renamed fields.
// Preserve an existing vendor field when both old and new keys are present.
async function migrateVendorProfileFields() {
  const renamedFields = {
    companyName: "vendorName",
    companyEmail: "vendorEmail",
    companyPhone: "vendorPhone",
  };
  const legacyFields = Object.keys(renamedFields);
  return VendorProfile.collection.updateMany(
    { $or: legacyFields.map((field) => ({ [field]: { $exists: true } })) },
    [
      {
        $set: Object.fromEntries(Object.entries(renamedFields).map(([oldField, newField]) => [
          newField,
          { $cond: [{ $eq: [{ $type: `$${newField}` }, "missing"] }, `$${oldField}`, `$${newField}`] },
        ])),
      },
      { $unset: legacyFields },
    ],
  );
}

module.exports = { migrateVendorProfileFields };
