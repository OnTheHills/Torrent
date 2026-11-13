const userService = require("@/services/user/userService");

async function createUser(request, response) {
  try {
    const user = await userService.createUser(request.body);
    return response.status(201).json(user);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getAllUsers(request, response) {
  try {
    const users = await userService.getAllUsers();
    return response.status(200).json(users);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getUserById(request, response) {
  try {
    const user = await userService.getUserById(request.params.id);

    if (!user) {
      return response.status(404).json({ message: "User not found." });
    }

    return response.status(200).json(user);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function updateUser(request, response) {
  try {
    const user = await userService.updateUser(
      request.params.id,
      request.body,
      request.user.role,
    );

    if (!user) {
      return response.status(404).json({ message: "User not found." });
    }

    return response.status(200).json(user);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function deleteUser(request, response) {
  try {
    const user = await userService.deleteUser(request.params.id);

    if (!user) {
      return response.status(404).json({ message: "User not found." });
    }

    return response.status(200).json(user);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
