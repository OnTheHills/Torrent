const VendorProfile = require("@/models/VendorProfile");

async function create(data) {
  return VendorProfile.create(data);
}

async function findAll() {
  return VendorProfile.find();
}

async function findById(id) {
  return VendorProfile.findById(id);
}

async function update(id, data) {
  return VendorProfile.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });
}

async function remove(id) {
  return VendorProfile.findByIdAndDelete(id);
}

module.exports = { create, findAll, findById, remove, update };
