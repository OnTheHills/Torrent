const BaseRepository = require("./BaseRepository");
const VendorProfile = require("../models/VendorProfile");

class VendorProfileRepository extends BaseRepository {
  constructor() {
    super(VendorProfile);
  }
}

module.exports = new VendorProfileRepository();
