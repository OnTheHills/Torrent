const assert = require("node:assert/strict");
const { test } = require("node:test");

test("audit logs are admin-readable and have no mutation route", { timeout: 15000 }, async (t) => {
  t.mock.method(console, "warn", () => {});
  const environment = {
    JWT_SECRET: "audit-protection-test-secret",
    COOKIE_SECURE: "false",
    NODE_ENV: "test",
  };
  for (const [key, value] of Object.entries(environment)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }

  const users = {
    "507f1f77bcf86cd799439011": {
      _id: "507f1f77bcf86cd799439011",
      email: "vendor@example.test",
      role: "vendor",
      disabled: false,
    },
    "507f1f77bcf86cd799439012": {
      _id: "507f1f77bcf86cd799439012",
      email: "admin@example.test",
      role: "admin",
      disabled: false,
    },
  };
  const userRepository = require("@/repositories/user/userRepository");
  t.mock.method(userRepository, "findAuthById", async (id) => users[String(id)] || null);
  const sessionRevocation = require("@/services/auth/sessionRevocation");
  t.mock.method(sessionRevocation, "isRevoked", async () => false);

  const calls = [];
  const controllerPath = require.resolve("@/controllers/admin/adminController");
  const previousController = require.cache[controllerPath];
  require.cache[controllerPath] = {
    id: controllerPath,
    filename: controllerPath,
    loaded: true,
    exports: new Proxy({}, {
      get(_target, action) {
        return (_request, response) => {
          calls.push(String(action));
          return response.json({ action: String(action) });
        };
      },
    }),
  };
  t.after(() => {
    if (previousController) require.cache[controllerPath] = previousController;
    else delete require.cache[controllerPath];
  });

  const express = require("express");
  const app = express();
  const router = require("@/routes/adminRoute");

  const { signUserToken } = require("@/utils/session");
  const sessions = {
    vendor: signUserToken(users["507f1f77bcf86cd799439011"]),
    admin: signUserToken(users["507f1f77bcf86cd799439012"]),
  };
  function dispatch(method, session) {
    return new Promise((resolve, reject) => {
      const request = {
        app,
        baseUrl: "/api/admin",
        cookies: session ? { torrent_session: session } : {},
        headers: {},
        ip: "127.0.0.1",
        method,
        originalUrl: "/api/admin/audit",
        params: {},
        query: {},
        socket: { remoteAddress: "127.0.0.1" },
        url: "/audit",
      };
      const response = {
        app,
        locals: {},
        req: request,
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          resolve({ status: this.statusCode, body });
          return this;
        },
      };
      request.res = response;
      router.handle(request, response, (error) => {
        if (error) reject(error);
        else resolve({ status: 404, body: undefined });
      });
    });
  }

  const anonymous = await dispatch("GET");
  assert.equal(anonymous.status, 401);

  const forbidden = await dispatch("GET", sessions.vendor);
  assert.equal(forbidden.status, 403);

  const allowed = await dispatch("GET", sessions.admin);
  assert.equal(allowed.status, 200);
  assert.deepEqual(allowed.body, { action: "auditLog" });

  for (const method of ["PATCH", "DELETE"]) {
    const vendorMutation = await dispatch(method, sessions.vendor);
    assert.equal(vendorMutation.status, 403, `${method} vendor audit access`);

    const adminMutation = await dispatch(method, sessions.admin);
    assert.equal(adminMutation.status, 404, `${method} admin audit access`);
  }
  assert.deepEqual(calls, ["auditLog"]);
});
