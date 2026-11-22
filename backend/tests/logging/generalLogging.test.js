const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { requestLogger } = require("@/middleware/requestLogger");
const { securityLog } = require("@/utils/securityLog");
const { buildLogEntry, logger } = require("@/utils/logger");
const { errorHandler } = require("@/middleware/errorHandler");
const AuditLog = require("@/models/admin/AuditLog");
const { record } = require("@/services/admin/audit");
const SyncRun = require("@/models/sync/SyncRun");
const syncRuns = require("@/services/admin/syncRuns");
const { errorFields, safeErrorSummary } = require("@/utils/logger");

function responseMock() {
  const response = new EventEmitter();
  response.headers = {};
  response.statusCode = 200;
  response.setHeader = (name, value) => { response.headers[name.toLowerCase()] = value; };
  response.sendStatus = (status) => {
    response.statusCode = status;
    response.emit("finish");
    return response;
  };
  response.status = (status) => {
    response.statusCode = status;
    return response;
  };
  response.json = (body) => {
    response.body = body;
    response.emit("finish");
    return response;
  };
  return response;
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(filename)
      : /\.(?:js|ts|tsx)$/.test(filename)
        ? [filename]
        : [];
  });
}

test("HTTP access logs use a generated request ID and a safe route template", (t) => {
  const logs = [];
  t.mock.method(console, "info", (line) => logs.push(JSON.parse(line)));
  const request = {
    method: "GET",
    route: { path: "/:id" },
    path: "/api/users/507f1f77bcf86cd799439011",
    ip: "203.0.113.2",
    headers: { cookie: "torrent_session=cookie-secret", "x-request-id": "client-id" },
    originalUrl: "/api/users/507f1f77bcf86cd799439011?token=query-secret",
  };
  const response = responseMock();
  requestLogger(request, response, () => {
    request.user = { sub: "user-1", role: "vendor", email: "private@example.test" };
    response.sendStatus(204);
  });
  const requestId = response.headers["x-request-id"];
  assert.match(requestId, /^[0-9a-f-]{36}$/i);
  assert.notEqual(requestId, request.headers["x-request-id"]);
  assert.equal(logs.length, 1);
  assert.deepEqual(
    {
      event: logs[0].event,
      level: logs[0].level,
      method: logs[0].method,
      route: logs[0].route,
      status: logs[0].status,
      requestId: logs[0].requestId,
      actorId: logs[0].actorId,
      actorRole: logs[0].actorRole,
    },
    {
      event: "http.request.completed",
      level: "info",
      method: "GET",
      route: "/api/users/:id",
      status: 204,
      requestId,
      actorId: "user-1",
      actorRole: "vendor",
    },
  );
  assert.match(logs[0].timestamp, /^\d{4}-\d\d-\d\dT.*Z$/);
  assert.ok(logs[0].durationMs >= 0);
  assert.equal("actorEmail" in logs[0], false);
  assert.doesNotMatch(JSON.stringify(logs[0]), /507f1f|query-secret|cookie-secret|private@example/);
});

test("security logs share request IDs and redact secrets without logging raw paths", (t) => {
  let logged;
  t.mock.method(console, "warn", (line) => { logged = JSON.parse(line); });
  securityLog(
    "authz_denied",
    { outcome: "denied", status: 403, token: "session-secret", actorEmail: "private@example.test" },
    {
      requestId: "c3216e8e-5681-4d83-8a62-3fc063f4634c",
      method: "POST",
      path: "/api/session-secret",
      user: { sub: "user-2", role: "vendor", email: "private@example.test" },
    },
  );

  assert.equal(logged.logType, "security");
  assert.equal(logged.requestId, "c3216e8e-5681-4d83-8a62-3fc063f4634c");
  assert.equal(logged.route, "/api/:param");
  assert.equal(logged.actorId, "user-2");
  assert.equal(logged.token, "[REDACTED]");
  assert.equal(logged.actorEmail, "[REDACTED]");
  assert.equal(logged.level, "warn");
  assert.doesNotMatch(JSON.stringify(logged), /session-secret|private@example/);
});

test("server errors emit correlated JSON security and HTTP records without raw details", (t) => {
  const logs = [];
  t.mock.method(console, "error", (line) => logs.push(JSON.parse(line)));
  const request = {
    method: "GET",
    route: { path: "/:id" },
    path: "/api/admin/secret-record-id",
    ip: "203.0.113.2",
  };
  const response = responseMock();
  requestLogger(request, response, () => {
    errorHandler(Object.assign(new Error("private database detail"), { code: "DB_FAILURE" }), request, response, () => {});
  });
  const requestId = response.headers["x-request-id"];

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { message: "Something went wrong." });
  assert.deepEqual(logs.map(({ event, level, status, route }) => ({ event, level, status, route })), [
    { event: "unexpected_error", level: "error", status: 500, route: "/api/admin/:id" },
    { event: "http.request.completed", level: "error", status: 500, route: "/api/admin/:id" },
  ]);
  assert.ok(logs.every((entry) => entry.requestId === requestId));
  assert.ok(logs.every((entry) => entry.timestamp.endsWith("Z")));
  assert.doesNotMatch(JSON.stringify(logs), /private database detail|secret-record-id/);
});

test("log envelope owns timestamp and severity and errors omit messages", () => {
  const entry = buildLogEntry("error", "operation.failed", {
    timestamp: "forged",
    level: "debug",
    password: "do-not-log",
    error: new Error("private details"),
  });
  assert.equal(entry.level, "error");
  assert.match(entry.timestamp, /^\d{4}-\d\d-\d\dT.*Z$/);
  assert.equal(entry.password, "[REDACTED]");
  assert.deepEqual(entry.error, { name: "Error" });
  assert.doesNotMatch(JSON.stringify(entry), /private details|do-not-log|forged/);
});

test("runtime log encoding prevents CRLF and Unicode line injection", (t) => {
  const lines = [];
  t.mock.method(console, "warn", (line) => lines.push(line));
  logger.warn("security.event\r\nforged\u2028line\u2029", {
    reason: "denied\r\nlevel=info\u2028forged\u2029line",
    nested: { ["field\r\nforged\u2028line\u2029"]: "value\u2028line\u2029" },
  });

  assert.equal(lines.length, 1);
  assert.doesNotMatch(lines[0], /[\r\n\u2028\u2029]/);
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.event, "security.event  forged line ");
  assert.equal(entry.reason, "denied  level=info forged line");
  assert.equal(entry.nested["field  forged line "], "value line ");
});

test("direct Error serialization validates names and codes", () => {
  const entry = buildLogEntry("error", "operation.failed", {
    error: Object.assign(new Error("must be omitted"), {
      name: "private@example.test",
      code: "TOKEN=private-value",
    }),
  });
  assert.deepEqual(entry.error, {});
  assert.doesNotMatch(JSON.stringify(entry), /private@example|TOKEN=|must be omitted/);
});

test("production logging uses only the documented shared console sink", () => {
  const backendSource = path.resolve(__dirname, "../../src");
  const frontendSource = path.resolve(__dirname, "../../../frontend/src");
  const sharedSinks = new Set([
    path.join(backendSource, "utils/logger.js"),
    path.join(frontendSource, "lib/log.ts"),
  ]);
  const directWrites = [backendSource, frontendSource].flatMap(sourceFiles).filter((filename) =>
    !sharedSinks.has(filename) &&
    /\bconsole\.(?:log|info|warn|error|debug)\s*\(/.test(readFileSync(filename, "utf8")),
  );
  assert.deepEqual(directWrites, []);
});

test("frontend log sink emits only JSON event metadata", () => {
  const source = readFileSync(path.resolve(__dirname, "../../../frontend/src/lib/log.ts"), "utf8");
  assert.match(source, /console\.error\(JSON\.stringify\(/);
  assert.match(source, /timestamp:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(source, /event:\s*event\.replace\(\//);
  assert.match(source, /\\u2028\\u2029/);
  assert.doesNotMatch(source, /error\.message|error\.stack|submittedProfile|actorEmail/);
});

test("development MongoDB is published to host loopback only", () => {
  const composeFile = path.resolve(__dirname, "../../../docker-compose.yml");
  const compose = readFileSync(composeFile, "utf8");
  assert.match(compose, /"127\.0\.0\.1:27017:27017"/);
  assert.doesNotMatch(compose, /"27017:27017"/);

  const service = (name) =>
    new RegExp(`^  ${name}:([\\s\\S]*?)(?=^  [\\w-]+:|^networks:)`, "m").exec(compose)?.[1] || "";
  assert.match(service("backend"), /networks:\n\s+- application\n\s+- database/);
  assert.match(service("mongo"), /networks:\n\s+- database/);
  assert.match(service("frontend"), /networks:\n\s+- application/);
  assert.doesNotMatch(service("frontend"), /\n\s+- database/);
});

test("durable audit and sync records have no automatic TTL expiry", () => {
  for (const model of [AuditLog, SyncRun]) {
    const ttlIndexes = model.schema.indexes().filter(([, options]) => options.expireAfterSeconds !== undefined);
    assert.deepEqual(ttlIndexes, [], `${model.modelName} retention is external/manual`);
  }
});

test("error metadata rejects arbitrary codes and stored errors omit messages", () => {
  const error = Object.assign(new Error("private@example.test token=hidden"), {
    name: "https://attacker.test/name",
    code: "private@example.test?token=hidden",
  });
  assert.deepEqual(errorFields(error), {});
  assert.equal(safeErrorSummary(error), "Operation failed");
  assert.equal(safeErrorSummary(Object.assign(new Error("hidden"), { code: "ECONNRESET" })), "ECONNRESET");
});

test("sync run history stores only safe source counters and error codes", async (t) => {
  const update = t.mock.method(SyncRun, "findByIdAndUpdate", async (_id, changes) => changes);
  const privateDetails = "private@example.test https://source.test/?token=hidden";
  const summary = [{
    source: "DATA-GO-EGP",
    sourceKey: "dataGo",
    status: "failed",
    fetched: 2,
    created: 1,
    error: privateDetails,
    metadata: { email: "private@example.test", authorization: "bearer-secret" },
    updatedTorIds: ["507f1f77bcf86cd799439011"],
  }];
  const changes = await syncRuns.finish(
    { _id: "run-1", startedAt: new Date("2026-01-01T00:00:00.000Z") },
    { status: "failed", summary, error: privateDetails },
  );

  assert.deepEqual(changes.summary, [{
    source: "DATA-GO-EGP",
    sourceKey: "dataGo",
    status: "failed",
    fetched: 2,
    created: 1,
    error: "Operation failed",
  }]);
  assert.equal(changes.error, "Operation failed");
  assert.equal(changes.fetched, 2);
  assert.equal(changes.createdCount, 1);
  assert.doesNotMatch(JSON.stringify(changes), /private@example|source\.test|hidden|507f1f|bearer-secret/);
  assert.equal(update.mock.calls.length, 1);
});

test("admin audit records retain the request ID for correlation", async (t) => {
  const create = t.mock.method(AuditLog, "create", async (entry) => entry);
  const requestId = "b0530372-9b8a-4b72-9379-b8e7c7117ab0";
  const saved = await record(
    { sub: "507f1f77bcf86cd799439011", email: "admin@example.test", role: "admin" },
    { action: "tor.review", targetType: "tor" },
    requestId,
  );
  assert.equal(saved.requestId, requestId);
  assert.equal(create.mock.calls.length, 1);
  assert.ok(AuditLog.schema.path("requestId"));
});
