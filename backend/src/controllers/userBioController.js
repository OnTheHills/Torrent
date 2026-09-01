const UserBio = require("../models/UserBio");

async function createUserBio(request, response) {
  try {
    const userBio = await UserBio.create(request.body);
    return response.status(201).json(userBio);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getAllUserBios(request, response) {
  try {
    const userBios = await UserBio.find();
    return response.status(200).json(userBios);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getUserBioById(request, response) {
  try {
    const userBio = await UserBio.findById(request.params.id);

    if (!userBio) {
      return response.status(404).json({ message: "User bio not found." });
    }

    return response.status(200).json(userBio);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function updateUserBio(request, response) {
  try {
    const userBio = await UserBio.findByIdAndUpdate(
      request.params.id,
      request.body,
      { returnDocument: "after", runValidators: true },
    );

    if (!userBio) {
      return response.status(404).json({ message: "User bio not found." });
    }

    return response.status(200).json(userBio);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function deleteUserBio(request, response) {
  try {
    const userBio = await UserBio.findByIdAndDelete(request.params.id);

    if (!userBio) {
      return response.status(404).json({ message: "User bio not found." });
    }

    return response.status(200).json(userBio);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

module.exports = {
  createUserBio,
  getAllUserBios,
  getUserBioById,
  updateUserBio,
  deleteUserBio,
};
