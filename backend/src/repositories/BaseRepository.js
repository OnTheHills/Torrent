class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async getById(id) {
    return await this.model.findById(id);
  }

  async getOne(filter) {
    return await this.model.findOne(filter);
  }

  async list(filter = {}, projection = {}) {
    return await this.model.find(filter, projection);
  }

  async post(data) {
    return await this.model.create(data);
  }

  async updateById(id, updatedData) {
    return await this.model.findByIdAndUpdate(id, { $set: updatedData }, { new: true });
  }

  async updateOne(filter, data) {
    return await this.model.findOneAndUpdate(filter, { $set: data }, { new: true });
  }

  async delById(id) {
    return await this.model.findByIdAndDelete(id);
  }
}

module.exports = BaseRepository;
