const TORMatch = require("@/models/TORMatch");

async function create(data) {
  return TORMatch.create(data);
}

async function findAll() {
  return TORMatch.find();
}

async function findById(id) {
  return TORMatch.findById(id);
}

async function update(id, data) {
  return TORMatch.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });
}

async function remove(id) {
  return TORMatch.findByIdAndDelete(id);
}

module.exports = { create, findAll, findById, remove, update };
