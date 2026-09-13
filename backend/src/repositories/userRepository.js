const User = require("@/models/User");

async function create(data) {
  return User.create(data);
}

async function findAll() {
  return User.find();
}

async function findByEmail(email) {
  return User.findOne({ email });
}

async function findByGoogleId(googleId) {
  return User.findOne({ googleId });
}

async function findById(id) {
  return User.findById(id);
}

async function findPublicById(id) {
  return User.findById(id).select("-passwordHash");
}

async function save(user) {
  return user.save();
}

async function update(id, data) {
  return User.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });
}

async function remove(id) {
  return User.findByIdAndDelete(id);
}

module.exports = {
  create,
  findAll,
  findByEmail,
  findByGoogleId,
  findById,
  findPublicById,
  remove,
  save,
  update,
};
