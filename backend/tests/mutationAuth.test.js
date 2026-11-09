const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const { once } = require("node:events");
const { test } = require("node:test");
const jwt = require("jsonwebtoken");

test("the application requires a session for mutations and preserves public exceptions", { timeout: 15000 }, async (t) => {
  const environment = {
    CORS_ORIGIN: "https://torrent.example.test",
    JWT_SECRET: "mutation-auth-test-secret",
    LINE_CHANNEL_SECRET: "mutation-auth-line-test-secret",
    CSRF_SECRET: "mutation-csrf-test-secret-used-only-by-tests",
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

  const calls = [];
  function stubModule(name, exports) {
    const filename = require.resolve(name);
    const previous = require.cache[filename];
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
    t.after(() => {
      if (previous) require.cache[filename] = previous;
      else delete require.cache[filename];
    });
  }

  // Exercise the real application, routes, JWT, role checks, and LINE signature
  // verification while keeping controllers away from databases/external APIs.
  for (const name of ["auth", "user", "userBio", "vendorProfile", "tor", "torMatch", "sync", "admin", "line"]) {
    stubModule(`@/controllers/${name}Controller`, new Proxy({}, {
      get(_target, action) {
        if (name === "line" && action === "processWebhookEvents") {
          return async () => { calls.push("line.processWebhookEvents"); };
        }
        return (request, response) => {
          calls.push(`${name}.${String(action)}`);
          return response.json({ action, user: request.user || null });
        };
      },
    }));
  }
  stubModule("@/jobs/lineWeeklyDigest", { runLineWeeklyDigest: async () => ({ ok: true }) });

  const app = require("@/app");
  // No production PUT route currently exists; this also checks that a future
  // route is automatically covered without adding a route-local auth guard.
  app.put("/api/mutation-auth-test", (request, response) => response.json({ user: request.user }));
  const server = app.listen(0, "127.0.0.1");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const { signUserToken } = require("@/utils/session");
  const user = { _id: "507f1f77bcf86cd799439011", email: "vendor@example.test", role: "vendor" };
  const token = signUserToken(user);
  const cookie = (value = token) => ({ Cookie: `torrent_session=${value}` });
  async function csrfHeaders(session = token, previousCookies = "") {
    const response = await fetch(base + "/api/auth/csrf", {
      headers: {
        Origin: environment.CORS_ORIGIN,
        Cookie: [previousCookies, session ? `torrent_session=${session}` : ""].filter(Boolean).join("; "),
      },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const cookies = response.headers.getSetCookie().map((value) => value.split(";")[0]);
    if (session) cookies.push(`torrent_session=${session}`);
    const body = await response.json();
    assert.equal(typeof body.csrfToken, "string");
    return {
      Origin: environment.CORS_ORIGIN,
      Cookie: cookies.join("; "),
      "x-csrf-token": body.csrfToken,
    };
  }
  const mutations = [
    ["POST", "/api/user-bios"],
    ["PUT", "/api/mutation-auth-test"],
    ["PATCH", "/api/user-bios/507f1f77bcf86cd799439012"],
    ["DELETE", "/api/tor-matches/507f1f77bcf86cd799439012"],
  ];

  await t.test("all four mutation methods reject a missing session before calling controllers", async () => {
    const before = calls.length;
    for (const [method, path] of mutations) {
      const response = await fetch(base + path, { method });
      assert.equal(response.status, 401, `${method} ${path}`);
      assert.deepEqual(await response.json(), { message: "Not signed in." });
    }
    assert.equal(calls.length, before);
  });

  await t.test("invalid, expired, unsigned, and wrongly signed tokens are rejected", async () => {
    const invalidTokens = [
      "not-a-jwt",
      jwt.sign({ sub: user._id }, environment.JWT_SECRET, { expiresIn: -1 }),
      jwt.sign({ sub: user._id }, "", { algorithm: "none" }),
      jwt.sign({ sub: user._id }, "another-test-secret"),
    ];
    const before = calls.length;
    for (const invalid of invalidTokens) {
      for (const [method, path] of mutations) {
        const response = await fetch(base + path, { method, headers: cookie(invalid) });
        assert.equal(response.status, 401, `${method} rejects invalid session`);
        await response.arrayBuffer();
      }
    }
    assert.equal(calls.length, before);
  });

  await t.test("all four mutation methods accept a valid session and expose verified user claims", async () => {
    for (const [method, path] of mutations) {
      const response = await fetch(base + path, { method, headers: await csrfHeaders() });
      assert.equal(response.status, 200, `${method} ${path}`);
      const body = await response.json();
      assert.equal(body.user.sub, user._id);
      assert.equal(body.user.role, "vendor");
    }
  });

  await t.test("a bearer header does not replace the session cookie", async () => {
    const response = await fetch(base + "/api/user-bios", {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 401);
    await response.arrayBuffer();
  });

  await t.test("unauthenticated JSON and multipart writes are rejected before body parsing", async () => {
    for (const type of ["application/json", "multipart/form-data; boundary=test"]) {
      const response = await fetch(base + "/api/vendor-profiles", {
        method: "POST", headers: { "Content-Type": type }, body: "malformed-body",
      });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { message: "Not signed in." });
    }
  });

  await t.test("public GET and HEAD routes remain accessible even with a stale cookie", async () => {
    for (const path of ["/", "/api/hello", "/api/tors", "/api/user-bios", "/api/tor-matches"]) {
      for (const method of ["GET", "HEAD"]) {
        const response = await fetch(base + path, { method, headers: cookie("stale") });
        assert.equal(response.status, 200, `${method} ${path}`);
        await response.arrayBuffer();
      }
    }
  });

  await t.test("CORS preflight does not require a session", async () => {
    const response = await fetch(base + "/api/user-bios", {
      method: "OPTIONS", headers: {
        Origin: environment.CORS_ORIGIN,
        "Access-Control-Request-Method": "POST",
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), environment.CORS_ORIGIN);
  });

  await t.test("existing authenticated GET and role restrictions still apply", async () => {
    const anonymous = await fetch(base + "/api/auth/me");
    assert.equal(anonymous.status, 401);
    await anonymous.arrayBuffer();
    const signedIn = await fetch(base + "/api/auth/me", { headers: cookie() });
    assert.equal(signedIn.status, 200);
    await signedIn.arrayBuffer();
    for (const [method, path] of [["GET", "/api/admin/overview"], ["POST", "/api/tors"]]) {
      const forbidden = await fetch(base + path, { method, headers: await csrfHeaders() });
      assert.equal(forbidden.status, 403);
      assert.equal((await forbidden.json()).message, "Forbidden.");
      const adminToken = signUserToken({ ...user, role: "admin" });
      const allowed = await fetch(base + path, { method, headers: await csrfHeaders(adminToken) });
      assert.equal(allowed.status, 200);
      await allowed.arrayBuffer();
    }
  });

  await t.test("Google login stays reachable without a session, including a trailing slash/query", async () => {
    for (const path of ["/api/auth/google", "/api/auth/google/?source=test", "/API/AUTH/GOOGLE"]) {
      const response = await fetch(base + path, { method: "POST", headers: await csrfHeaders(null) });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).action, "googleLogin");
    }
  });

  await t.test("exceptions do not bypass auth for other methods, sibling paths, logout, or dev-admin", async () => {
    const paths = [
      ["POST", "/api/auth/google/extra"], ["POST", "/api/auth/google-extra"],
      ["POST", "/api/line/webhook/extra"], ["POST", "/api/line/webhook-extra"],
      ["POST", "/api/auth/dev-admin"], ["POST", "/api/auth/logout"],
      ["PUT", "/api/auth/google"], ["PATCH", "/api/line/webhook"],
    ];
    for (const [method, path] of paths) {
      const response = await fetch(base + path, { method });
      assert.equal(response.status, 401, `${method} ${path}`);
      await response.arrayBuffer();
    }
  });

  await t.test("LINE webhook requires its own valid signature without a browser session", async () => {
    const body = JSON.stringify({ events: [] });
    const signature = createHmac("sha256", environment.LINE_CHANNEL_SECRET).update(body).digest("base64");
    const before = calls.filter((action) => action === "line.processWebhookEvents").length;
    for (const suppliedSignature of [undefined, "invalid", signature]) {
      const response = await fetch(base + "/api/line/webhook", {
        method: "POST", body, headers: {
          "Content-Type": "application/json",
          ...(suppliedSignature ? { "x-line-signature": suppliedSignature } : {}),
        },
      });
      assert.equal(response.status, suppliedSignature === signature ? 200 : 401);
      await response.arrayBuffer();
    }
    assert.equal(calls.filter((action) => action === "line.processWebhookEvents").length, before + 1);
  });

  await t.test("every mutation method rejects missing, forged, or cookie-only CSRF tokens before the handler", async () => {
    const valid = await csrfHeaders();
    const before = calls.length;
    for (const [method, path] of mutations) {
      const missing = { ...valid };
      delete missing["x-csrf-token"];
      for (const headers of [missing, { ...valid, "x-csrf-token": "forged" }, {
        Origin: valid.Origin, ...cookie(), "x-csrf-token": valid["x-csrf-token"],
      }]) {
        const response = await fetch(base + path, { method, headers });
        assert.equal(response.status, 403);
        assert.equal((await response.json()).code, "INVALID_CSRF_TOKEN");
      }
    }
    assert.equal(calls.length, before);
  });

  await t.test("untrusted, null, and absent origins cannot mutate even with valid JWT and CSRF tokens", async () => {
    const valid = await csrfHeaders();
    const before = calls.length;
    for (const origin of ["https://attacker.example.test", "null", undefined]) {
      const headers = { ...valid };
      if (origin === undefined) delete headers.Origin;
      else headers.Origin = origin;
      const response = await fetch(base + "/api/user-bios", { method: "POST", headers });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, "INVALID_ORIGIN");
    }
    assert.equal(calls.length, before);
    const endpoint = await fetch(base + "/api/auth/csrf", { headers: { Origin: "https://attacker.example.test" } });
    assert.equal(endpoint.status, 403);
    assert.equal(endpoint.headers.getSetCookie().length, 0);
    await endpoint.arrayBuffer();
  });

  await t.test("login is protected against CSRF before a JWT exists", async () => {
    const before = calls.length;
    const response = await fetch(base + "/api/auth/google", {
      method: "POST", headers: { Origin: environment.CORS_ORIGIN },
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "INVALID_CSRF_TOKEN");
    assert.equal(calls.length, before);
  });

  await t.test("tokens are bound to the JWT and can be renewed after session changes", async () => {
    const old = await csrfHeaders();
    const changed = jwt.sign({ sub: user._id, role: "vendor", jti: "another-session" }, environment.JWT_SECRET, { expiresIn: "1h" });
    const oldCookies = old.Cookie.split("; ").filter((value) => !value.startsWith("torrent_session=")).join("; ");
    const response = await fetch(base + "/api/user-bios", {
      method: "POST", headers: { ...old, Cookie: `${oldCookies}; torrent_session=${changed}` },
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "INVALID_CSRF_TOKEN");
    const renewed = await csrfHeaders(changed, oldCookies);
    const allowed = await fetch(base + "/api/user-bios", { method: "POST", headers: renewed });
    assert.equal(allowed.status, 200);
    await allowed.arrayBuffer();
  });

  await t.test("authenticated multipart requests accept header tokens without parsing files first", async () => {
    const form = new FormData();
    form.append("example", "value");
    const response = await fetch(base + "/api/user-bios", {
      method: "POST", headers: await csrfHeaders(), body: form,
    });
    assert.equal(response.status, 200);
    await response.arrayBuffer();
  });

  await t.test("production CSRF cookies use the Host prefix and secure host-only attributes", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const { createCsrfProtection } = require("@/middleware/csrfProtection");
      const csrf = createCsrfProtection([environment.CORS_ORIGIN]);
      const cookies = [];
      const request = { cookies: {}, get: () => environment.CORS_ORIGIN };
      const response = {
        cookie(name, _value, options) { cookies.push({ name, options }); return this; },
        set() {}, vary() {}, json() {},
      };
      csrf.issueToken(request, response);
      assert.equal(cookies.length, 2);
      for (const { name, options } of cookies) {
        assert.ok(name.startsWith("__Host-"));
        assert.equal(options.secure, true);
        assert.equal(options.httpOnly, true);
        assert.equal(options.path, "/");
        assert.equal(options.domain, undefined);
      }
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
