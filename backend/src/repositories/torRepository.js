const TOR = require("../models/TOR");

class TorRepository {
  async findAll() {
    return await TOR.find().sort({ publishedAt: -1 });
  }

  async findById(id) {
    return await TOR.findById(id);
  }

  async create(data) {
    return await TOR.create(data);
  }

  async update(id, data) {
    return await TOR.findByIdAndUpdate(id, data, {
      returnDocument: "after",
      runValidators: true,
    });
  }

  async delete(id) {
    return await TOR.findByIdAndDelete(id);
  }

  async upsertByRefId(refId, data) {
    return await TOR.findOneAndUpdate({ refId }, data, {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
    });
  }
}

module.exports = new TorRepository();
