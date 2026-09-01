const TOR = require("../models/TOR");

async function createTor(request, response) {
  try {
    const tor = await TOR.create(request.body);
    return response.status(201).json(tor);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getAllTors(request, response) {
  try {
    const tors = await TOR.find();
    return response.status(200).json(tors);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getTorById(request, response) {
  try {
    const tor = await TOR.findById(request.params.id);

    if (!tor) {
      return response.status(404).json({ message: "TOR not found." });
    }

    return response.status(200).json(tor);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function updateTor(request, response) {
  try {
    const tor = await TOR.findByIdAndUpdate(request.params.id, request.body, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!tor) {
      return response.status(404).json({ message: "TOR not found." });
    }

    return response.status(200).json(tor);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function deleteTor(request, response) {
  try {
    const tor = await TOR.findByIdAndDelete(request.params.id);

    if (!tor) {
      return response.status(404).json({ message: "TOR not found." });
    }

    return response.status(200).json(tor);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

module.exports = {
  createTor,
  getAllTors,
  getTorById,
  updateTor,
  deleteTor,
};
