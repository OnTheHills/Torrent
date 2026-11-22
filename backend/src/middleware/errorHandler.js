const { securityLog } = require("@/utils/securityLog");
const { errorFields } = require("@/utils/logger");

function clientMessage(error, status) {
  if (status >= 500) return "Something went wrong.";
  if (error?.expose === false) return "Something went wrong.";
  const message = typeof error?.message === "string" ? error.message.trim() : "";
  return message || "Request failed.";
}

function statusOf(error) {
  const status = Number(error?.statusCode || error?.status || 500);
  if (!Number.isFinite(status) || status < 400 || status > 599) return 500;
  return status;
}

/** Express 5 error middleware — never send stacks or internal details to clients. */
function errorHandler(error, request, response, _next) {
  if (response.headersSent) return;

  let status = statusOf(error);
  if (error instanceof SyntaxError && "body" in error) {
    status = 400;
  }

  if (status >= 500) {
    securityLog(
      "unexpected_error",
      {
        outcome: "failure",
        status,
        ...errorFields(error),
      },
      request,
    );
  }

  return response.status(status).json({
    message: status === 400 && error instanceof SyntaxError
      ? "Invalid JSON body."
      : clientMessage(error, status),
    ...(status < 500 && error?.code ? { code: error.code } : {}),
  });
}

function notFoundHandler(request, response) {
  if (!/^\/api(?:\/|$)/i.test(request.path)) {
    return response.status(404).json({ message: "Not found." });
  }
  return response.status(404).json({ message: "Not found." });
}

/** Map thrown service errors to JSON without leaking 500 details. */
function sendJson(work, successStatus = 200) {
  return async function (request, response, next) {
    try {
      const result = await work(request, response);
      if (response.headersSent) return undefined;
      return response.status(successStatus).json(result);
    } catch (error) {
      const status = statusOf(error);
      if (status >= 500) return next(error);
      return response.status(status).json({
        message: clientMessage(error, status),
        ...(error?.code ? { code: error.code } : {}),
      });
    }
  };
}

module.exports = { errorHandler, notFoundHandler, sendJson, clientMessage, statusOf };
