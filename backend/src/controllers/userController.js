const User = require("../models/User");

async function createUser(request, response) {
  try {
    const user = await User.create(request.body);
    return response.status(201).json(user);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getAllUsers(request, response) {
  try {
    const users = await User.find();
    return response.status(200).json(users);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getUserById(request, response) {
  try {
    const user = await User.findById(request.params.id);

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
    const user = await User.findByIdAndUpdate(request.params.id, request.body, {
      returnDocument: "after",
      runValidators: true,
    });

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
    const user = await User.findByIdAndDelete(request.params.id);

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
