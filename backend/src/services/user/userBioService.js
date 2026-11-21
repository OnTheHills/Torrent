const userBioRepository = require("@/repositories/user/userBioRepository");
const { objectBody, stringField, requireObjectId } = require("@/utils/validate");

function bioPayload(data) {
  const body = objectBody(data, "Provide a user bio object.");
  const payload = {};
  if (Object.hasOwn(body, "userId")) {
    payload.userId = requireObjectId(String(body.userId), "User");
  }
  if (Object.hasOwn(body, "userPhone")) {
    payload.userPhone = stringField(body.userPhone, { max: 40, label: "Phone" }) || "";
  }
  if (Object.hasOwn(body, "userEmail")) {
    const email = stringField(body.userEmail, { max: 254, label: "Email" });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const error = new Error("Email is invalid.");
      error.statusCode = 400;
      throw error;
    }
    payload.userEmail = email || "";
  }
  return payload;
}

async function createUserBio(data) {
  return userBioRepository.create(bioPayload(data));
}

async function getAllUserBios() {
  return userBioRepository.findAll();
}

async function getUserBiosForActor(actor) {
  if (actor?.role === "admin") return userBioRepository.findAll();
  return userBioRepository.findByUserId(actor.sub);
}

async function getUserBioById(id) {
  requireObjectId(id, "User bio");
  return userBioRepository.findById(id);
}

async function updateUserBio(id, data) {
  requireObjectId(id, "User bio");
  return userBioRepository.update(id, bioPayload(data));
}

async function deleteUserBio(id) {
  requireObjectId(id, "User bio");
  return userBioRepository.remove(id);
}

module.exports = {
  createUserBio,
  deleteUserBio,
  getAllUserBios,
  getUserBiosForActor,
  getUserBioById,
  updateUserBio,
};
