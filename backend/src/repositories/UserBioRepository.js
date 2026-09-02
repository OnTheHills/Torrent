const BaseRepository = require("./BaseRepository");
const UserBio = require("../models/UserBio");

class UserBioRepository extends BaseRepository {
  constructor() {
    super(UserBio);
  }
}

module.exports = new UserBioRepository();
