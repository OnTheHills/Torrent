const torMatchService = require("@/services/tor/torMatchService");

async function createTorMatch(request, response) {
  try {
    const torMatch = await torMatchService.createTorMatch(request.body);
    return response.status(201).json(torMatch);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getAllTorMatches(request, response) {
  try {
    const torMatches = await torMatchService.getAllTorMatches();
    return response.status(200).json(torMatches);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getPendingTorMatchIds(_request, response) {
  try {
    const ids = await torMatchService.getPendingTorIds();
    return response.status(200).json(ids);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getMyTorMatches(request, response) {
  try {
    const torMatches = await torMatchService.getTorMatchesByUserId(request.user.sub);
    return response.status(200).json(torMatches);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function setMyMatchDismissed(request, response) {
  try {
    const dismissed = request.body?.dismissed !== false;
    const torMatch = await torMatchService.setMyMatchDismissed(
      request.params.id,
      request.user.sub,
      dismissed,
    );

    if (!torMatch) {
      return response.status(404).json({ message: "TOR match not found." });
    }

    return response.status(200).json(torMatch);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getTorMatchById(request, response) {
  try {
    const torMatch = await torMatchService.getTorMatchById(request.params.id);

    if (!torMatch) {
      return response.status(404).json({ message: "TOR match not found." });
    }

    return response.status(200).json(torMatch);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function updateTorMatch(request, response) {
  try {
    const torMatch = await torMatchService.updateTorMatch(
      request.params.id,
      request.body,
    );

    if (!torMatch) {
      return response.status(404).json({ message: "TOR match not found." });
    }

    return response.status(200).json(torMatch);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function deleteTorMatch(request, response) {
  try {
    const torMatch = await torMatchService.deleteTorMatch(request.params.id);

    if (!torMatch) {
      return response.status(404).json({ message: "TOR match not found." });
    }

    return response.status(200).json(torMatch);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

module.exports = {
  createTorMatch,
  getAllTorMatches,
  getPendingTorMatchIds,
  getMyTorMatches,
  setMyMatchDismissed,
  getTorMatchById,
  updateTorMatch,
  deleteTorMatch,
};
