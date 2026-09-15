const torCrudService = require("@/services/tor/torCrudService");

async function createTor(request, response) {
  try {
    const tor = await torCrudService.createTor(request.body);
    return response.status(201).json(tor);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getAllTors(request, response) {
  try {
    const tors = await torCrudService.getAllTors();
    return response.status(200).json(tors);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getTorById(request, response) {
  try {
    const tor = await torCrudService.getTorById(request.params.id);
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
    const tor = await torCrudService.updateTor(request.params.id, request.body);
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
    const tor = await torCrudService.deleteTor(request.params.id);
    if (!tor) {
      return response.status(404).json({ message: "TOR not found." });
    }
    return response.status(200).json(tor);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

module.exports = { createTor, deleteTor, getAllTors, getTorById, updateTor };
