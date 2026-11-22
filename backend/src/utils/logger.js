const SENSITIVE_FIELD = /(?:password|passphrase|credential|authorization|cookie|token|session|secret|api.?key|private.?key|csrf|email|phone|payment|card.?number)/i;

function safeErrorName(value) {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(value) ? value : undefined;
}

function safeErrorCode(value) {
  return typeof value === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(value) ? value : undefined;
}

function safeValue(value, field = "") {
  if (SENSITIVE_FIELD.test(field)) return "[REDACTED]";
  if (value instanceof Error) {
    return {
      name: value.name,
      ...(typeof value.code === "string" ? { code: value.code } : {}),
    };
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => safeValue(item));
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, safeValue(item, key)]),
    );
  }
  if (typeof value === "string") return value.replace(/[\r\n\u2028\u2029]/g, " ");
  if (["number", "boolean"].includes(typeof value) || value === null) return value;
  return undefined;
}

function buildLogEntry(level, event, fields = {}) {
  return {
    ...safeValue(fields),
    timestamp: new Date().toISOString(),
    level,
    service: "torrent-backend",
    event,
  };
}

function write(level, event, fields) {
  const entry = JSON.stringify(buildLogEntry(level, event, fields));
  console[level](entry);
}

function errorFields(error) {
  return {
    ...(safeErrorName(error?.name) ? { errorName: safeErrorName(error.name) } : {}),
    ...(safeErrorCode(error?.code) ? { errorCode: safeErrorCode(error.code) } : {}),
    ...(Number.isInteger(error?.statusCode) ? { errorStatus: error.statusCode } : {}),
  };
}

function safeErrorSummary(error) {
  if (error == null) return undefined;
  if (typeof error === "string") return safeErrorCode(error) || "Operation failed";
  const fields = errorFields(error);
  return fields.errorCode || fields.errorName || "Operation failed";
}

const logger = Object.freeze({
  debug: (event, fields) => write("debug", event, fields),
  info: (event, fields) => write("info", event, fields),
  warn: (event, fields) => write("warn", event, fields),
  error: (event, fields) => write("error", event, fields),
});

module.exports = { buildLogEntry, errorFields, logger, safeErrorSummary };
