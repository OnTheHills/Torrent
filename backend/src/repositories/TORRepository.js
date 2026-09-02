const BaseRepository = require("./BaseRepository");
const TOR = require("../models/TOR");

class TORRepository extends BaseRepository {
  constructor() {
    super(TOR);
  }
}

module.exports = new TORRepository();
