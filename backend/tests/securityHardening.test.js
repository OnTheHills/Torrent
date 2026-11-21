const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { SECRET_NAMES } = require("../src/config/secrets");

test("security hardening: Host session cookies, revoke, rate limits, headers", { timeout: 20000 }, async (t) => {
  const environment = {
    CORS_ORIGIN: "https://torrent.example.test",
    JWT_SECRET: "security-hardening-test-secret",
    LINE_CHANNEL_SECRET: "security-hardening-line-secret",
    CSRF_SECRET: "security-hardening-csrf-secret",
    COOKIE_SECRET: "security-hardening-cookie-secret",
    COOKIE_SECURE: "true",
    NODE_ENV: "test",
    RATE_LIMIT_CSRF_MAX: "5",
    RATE_LIMIT_GOOGLE_AUTH_MAX: "3",
  };

  const secretDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "torrent-sec-secrets-"));
  t.after(() => fs.rmSync(secretDirectory, { recursive: true, force: true }));
  const runtimeEnvironment = { ...environment, SECRETS_ONLY: "true" };
  for (const name of SECRET_NAMES) {
    const filename = path.join(secretDirectory, name.toLowerCase());
    fs.writeFileSync(filename, environment[name] || "placeholder");
    runtimeEnvironment[`${name}_FILE`] = filename;
    runtimeEnvironment[name] = "unused-raw-environment-value";
  }
  for (const [key, value] of Object.entries(runtimeEnvironment)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }

  // Fresh module graph so COOKIE_SECURE / rate-limit env apply.
  for (const key of Object.keys(require.cache)) {
    if (key.includes(`${path.sep}backend${path.sep}src${path.sep}`) || key.endsWith("app.js")) {
      delete require.cache[key];
    }
  }

  function stubModule(name, exports) {
    const filename = require.resolve(name);
    const previous = require.cache[filename];
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
    t.after(() => {
      if (previous) require.cache[filename] = previous;
      else delete require.cache[filename];
    });
  }

  const controllerGroups = {
    user: "user", vendorProfile: "vendor",
    tor: "tor", torMatch: "tor", sync: "sync", admin: "admin",
  };
  for (const [name, group] of Object.entries(controllerGroups)) {
    stubModule(`@/controllers/${group}/${name}Controller`, new Proxy({}, {
      get(_target, action) {
        return (request, response) => response.json({ action, user: request.user || null });
      },
    }));
  }

  const user = { _id: "507f1f77bcf86cd799439011", email: "vendor@example.test", role: "vendor" };
  const userRepository = require("@/repositories/user/userRepository");
  t.mock.method(userRepository, "findAuthById", async () => ({
    _id: user._id,
    email: user.email,
    role: "vendor",
    disabled: false,
  }));
  const authService = require("@/services/auth/authService");
  t.mock.method(authService, "getCurrentUser", async () => ({
    _id: user._id,
    email: user.email,
    role: "vendor",
  }));

  const app = require("@/app");
  const {
    sessionCookieName,
    HOST_SESSION_COOKIE,
    signUserToken,
    verifyUserToken,
    readSessionToken,
  } = require("@/utils/session");
  const { isRevoked } = require("@/services/auth/sessionRevocation");

  assert.equal(sessionCookieName(), HOST_SESSION_COOKIE);

  const server = app.listen(0, "127.0.0.1");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;

  await t.test("API responses include baseline security headers", async () => {
    const response = await fetch(`${base}/api/hello`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.match(response.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
    assert.equal(response.headers.get("cross-origin-resource-policy"), "same-site");
    assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
    await response.arrayBuffer();
  });

  await t.test("session tokens carry jti, typ, aud and Host cookie name is selected when secure", () => {
    const token = signUserToken(user);
    const claims = verifyUserToken(token);
    assert.equal(typeof claims.jti, "string");
    assert.ok(claims.jti.length > 10);
    assert.equal(claims.typ, "torrent_session");
    assert.equal(claims.aud, "torrent");
    assert.equal(
      readSessionToken({ [HOST_SESSION_COOKIE]: token }),
      token,
    );
  });

  await t.test("logout revokes the session jti", async () => {
    const token = signUserToken(user);
    const claims = verifyUserToken(token);
    // CSRF tokens are bound to the JWT when a session cookie is present.
    const csrf = await fetch(`${base}/api/auth/csrf`, {
      headers: {
        Origin: environment.CORS_ORIGIN,
        Cookie: `${HOST_SESSION_COOKIE}=${token}`,
      },
    });
    assert.equal(csrf.status, 200);
    const { csrfToken } = await csrf.json();
    const csrfCookies = csrf.headers.getSetCookie().map((value) => value.split(";")[0]);

    const logout = await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      headers: {
        Origin: environment.CORS_ORIGIN,
        "x-csrf-token": csrfToken,
        Cookie: [...csrfCookies, `${HOST_SESSION_COOKIE}=${token}`].join("; "),
      },
    });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("clear-site-data") || "", /cookies/);
    assert.equal(logout.headers.get("cache-control"), "no-store");
    assert.equal(await isRevoked(claims.jti), true);

    const me = await fetch(`${base}/api/auth/me`, {
      headers: { Cookie: `${HOST_SESSION_COOKIE}=${token}` },
    });
    assert.equal(me.status, 401);
    await me.arrayBuffer();
  });

  await t.test("CSRF endpoint rate-limits abusive clients", async () => {
    let limited = 0;
    for (let i = 0; i < 8; i += 1) {
      const response = await fetch(`${base}/api/auth/csrf`, {
        headers: { Origin: environment.CORS_ORIGIN },
      });
      if (response.status === 429) limited += 1;
      await response.arrayBuffer();
    }
    assert.ok(limited >= 1);
  });

  await t.test("rejects TRACE and conflicting Content-Length + Transfer-Encoding", async () => {
    const http = require("node:http");
    const port = server.address().port;

    function rawRequest(method, path, headers) {
      return new Promise((resolve, reject) => {
        const req = http.request(
          { host: "127.0.0.1", port, method, path, headers },
          (res) => {
            res.resume();
            res.on("end", () => resolve(res.statusCode));
          },
        );
        req.on("error", reject);
        req.end();
      });
    }

    assert.equal(await rawRequest("TRACE", "/api/hello", {}), 405);
    assert.equal(
      await rawRequest("POST", "/api/auth/logout", {
        Origin: environment.CORS_ORIGIN,
        "Content-Length": "2",
        "Transfer-Encoding": "chunked",
        "Content-Type": "application/json",
      }),
      400,
    );
  });

  await t.test("unknown API routes stay opaque without a session", async () => {
    const anonymous = await fetch(`${base}/api/does-not-exist`);
    assert.equal(anonymous.status, 401);
    const body = await anonymous.json();
    assert.equal(body.message, "Not signed in.");
    assert.equal(body.stack, undefined);
  });

  await t.test("stale sessionVersion is rejected", async () => {
    t.mock.method(userRepository, "findAuthById", async () => ({
      _id: user._id,
      email: user.email,
      role: "vendor",
      disabled: false,
      sessionVersion: 2,
    }));
    const token = signUserToken({ ...user, sessionVersion: 0 });
    const me = await fetch(`${base}/api/auth/me`, {
      headers: { Cookie: `${HOST_SESSION_COOKIE}=${token}` },
    });
    assert.equal(me.status, 401);
    await me.arrayBuffer();
  });
});
