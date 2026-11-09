const { requireAuth } = require("./requireAuth");

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PUBLIC_POST_PATHS = [
  /^\/api\/auth\/google\/?$/i,
  /^\/api\/line\/webhook\/?$/i,
];

function requireMutationAuth(request, response, next) {
  if (!MUTATION_METHODS.has(request.method)) return next();

  // Google verifies the login credential before issuing a session. LINE's
  // webhook verifies its HMAC signature instead of using a browser session.
  if (request.method === "POST" &&
      PUBLIC_POST_PATHS.some((path) => path.test(request.path))) {
    return next();
  }

  return requireAuth(request, response, next);
}

module.exports = { requireMutationAuth };
