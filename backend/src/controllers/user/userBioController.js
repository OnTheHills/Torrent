const userBioService = require("@/services/user/userBioService");

async function createUserBio(request, response) {
  try {
    const userBio = await userBioService.createUserBio(request.body);
    return response.status(201).json(userBio);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getAllUserBios(request, response) {
  try {
    const userBios = await userBioService.getAllUserBios();
    return response.status(200).json(userBios);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getUserBioById(request, response) {
  try {
    const userBio = await userBioService.getUserBioById(request.params.id);

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
    const userBio = await userBioService.updateUserBio(
      request.params.id,
      request.body,
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
    const userBio = await userBioService.deleteUserBio(request.params.id);

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
