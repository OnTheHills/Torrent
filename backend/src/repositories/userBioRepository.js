const UserBio = require("@/models/UserBio");

async function create(data) {
  return UserBio.create(data);
}

async function findAll() {
  return UserBio.find();
}

async function findById(id) {
  return UserBio.findById(id);
}

async function update(id, data) {
  return UserBio.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });
}

async function remove(id) {
  return UserBio.findByIdAndDelete(id);
}

module.exports = { create, findAll, findById, remove, update };
