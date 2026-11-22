const OBJECT_ID = /^[a-f0-9]{24}$/i;

function isObjectId(value) {
  return typeof value === "string" && OBJECT_ID.test(value);
}

function invalidIdError(label = "Resource") {
  const error = new Error(`${label} not found.`);
  error.statusCode = 404;
  return error;
}

function requireObjectId(value, label = "Resource") {
  if (!isObjectId(String(value || ""))) throw invalidIdError(label);
  return String(value);
}

/** Escape user text before embedding in a RegExp (ReDoS / injection). */
function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function objectBody(body, message = "Provide a JSON object.") {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
  return body;
}

function stringField(value, { max = 500, required = false, label = "Field" } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      const error = new Error(`${label} is required.`);
      error.statusCode = 400;
      throw error;
    }
    return undefined;
  }
  if (typeof value !== "string") {
    const error = new Error(`${label} must be a string.`);
    error.statusCode = 400;
    throw error;
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    const error = new Error(`${label} is too long.`);
    error.statusCode = 400;
    throw error;
  }
  return trimmed;
}

module.exports = {
  OBJECT_ID,
  isObjectId,
  invalidIdError,
  requireObjectId,
  escapeRegex,
  objectBody,
  stringField,
};
