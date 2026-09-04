const torService = require("../services/torService");

/**
 * Creates a new TOR.
 * Expects the TOR data in request.body.
 */
async function createTor(request, response) {
  try {
    const tor = await torService.createTor(request.body);
    return response.status(201).json(tor);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

/**
 * Retrieves all available TORs.
 */
async function getAllTors(request, response) {
  try {
    const tors = await torService.getAllTors();
    return response.status(200).json(tors);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getTorById(request, response) {
  try {
    const tor = await torService.getTorById(request.params.id);

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
    const tor = await torService.updateTor(request.params.id, request.body);

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
    const tor = await torService.deleteTor(request.params.id);

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
