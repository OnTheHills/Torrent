const userBioService = require("@/services/user/userBioService");
const { clientMessage, statusOf } = require("@/middleware/errorHandler");

async function respond(work, request, response, next, successStatus = 200) {
  try {
    const result = await work();
    if (response.headersSent) return undefined;
    return response.status(successStatus).json(result);
  } catch (error) {
    const status = statusOf(error);
    if (status >= 500) return next(error);
    return response.status(status).json({ message: clientMessage(error, status) });
  }
}

async function createUserBio(request, response, next) {
  return respond(
    () => userBioService.createUserBio(request.body),
    request,
    response,
    next,
    201,
  );
}

async function getAllUserBios(request, response, next) {
  return respond(
    () => userBioService.getUserBiosForActor(request.user),
    request,
    response,
    next,
  );
}

async function getUserBioById(request, response, next) {
  return respond(async () => {
    const userBio = await userBioService.getUserBioById(request.params.id);
    if (!userBio) {
      const error = new Error("User bio not found.");
      error.statusCode = 404;
      throw error;
    }
    if (
      request.user.role !== "admin" &&
      String(userBio.userId) !== String(request.user.sub)
    ) {
      const error = new Error("Forbidden.");
      error.statusCode = 403;
      throw error;
    }
    return userBio;
  }, request, response, next);
}

async function updateUserBio(request, response, next) {
  return respond(async () => {
    const userBio = await userBioService.updateUserBio(
      request.params.id,
      request.body,
    );
    if (!userBio) {
      const error = new Error("User bio not found.");
      error.statusCode = 404;
      throw error;
    }
    return userBio;
  }, request, response, next);
}

async function deleteUserBio(request, response, next) {
  return respond(async () => {
    const userBio = await userBioService.deleteUserBio(request.params.id);
    if (!userBio) {
      const error = new Error("User bio not found.");
      error.statusCode = 404;
      throw error;
    }
    return userBio;
  }, request, response, next);
}

module.exports = {
  createUserBio,
  getAllUserBios,
  getUserBioById,
  updateUserBio,
  deleteUserBio,
};
