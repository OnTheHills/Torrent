const BaseRepository = require("./BaseRepository");
const TORMatch = require("../models/TORMatch");

class TORMatchRepository extends BaseRepository {
  constructor() {
    super(TORMatch);
  }
}

module.exports = new TORMatchRepository();
