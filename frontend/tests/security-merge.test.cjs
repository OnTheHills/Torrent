const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { join, dirname } = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Execute the actual TypeScript functions with only Next's request context
// mocked. No production server, browser credential or real database is needed.
function loadTs(relativePath, stubs = {}) {
  const filename = join(__dirname, "..", relativePath);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(dirname(filename));
  loaded.require = (name) => {
    if (Object.hasOwn(stubs, name)) return stubs[name];
    throw new Error(`Unexpected dependency in security test: ${name}`);
  };
  loaded._compile(compiled, filename);
  return loaded.exports;
}
const cookieHelpers = loadTs("src/lib/session-cookie.ts");
const torId = "507f1f77bcf86cd799439011";
const sessionJar = { get: (name) => name === "torrent_session" ? { value: "test-session" } : undefined };

function pdfRoute(jar = sessionJar) {
  return loadTs("src/app/api/admin/tors/[id]/pdf/route.ts", {
    "next/headers": { cookies: async () => jar },
    "@/lib/session-cookie": cookieHelpers,
  }).GET;
}

test("PDF proxy uses only the protected backend PDF endpoint", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith(`/api/admin/tors/${torId}/pdf`));
    assert.equal(options.headers.cookie, "torrent_session=test-session");
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    assert.ok(options.signal instanceof AbortSignal);
    return new Response("%PDF-test", { headers: { "content-type": "application/pdf" } });
  });
  const result = await pdfRoute()(new Request("http://localhost/"), { params: Promise.resolve({ id: torId }) });
  assert.equal(result.status, 200);
  assert.equal(await result.text(), "%PDF-test");
  assert.equal(result.headers.get("cache-control"), "private, no-store");
});

test("PDF proxy rejects missing sessions and malformed IDs without fetching", async (t) => {
  t.mock.method(globalThis, "fetch", () => assert.fail("Unauthorized proxy request reached backend"));
  assert.equal((await pdfRoute({ get: () => undefined })(new Request("http://localhost/"), { params: Promise.resolve({ id: torId }) })).status, 401);
  assert.equal((await pdfRoute()(new Request("http://localhost/"), { params: Promise.resolve({ id: "../secret" }) })).status, 400);
});

test("PDF proxy preserves backend role denials and safe download failures", async (t) => {
  for (const status of [401, 403, 404, 502]) {
    t.mock.method(globalThis, "fetch", async () => Response.json({ message: "Request denied." }, { status }));
    const result = await pdfRoute()(new Request("http://localhost/"), { params: Promise.resolve({ id: torId }) });
    assert.equal(result.status, status);
    assert.deepEqual(await result.json(), { message: "Request denied." });
  }
  t.mock.method(globalThis, "fetch", async () => new Response("<html>WAF</html>", { headers: { "content-type": "text/html" } }));
  assert.equal((await pdfRoute()(new Request("http://localhost/"), { params: Promise.resolve({ id: torId }) })).status, 502);
});

function sessionGate(jar = sessionJar) {
  return loadTs("src/lib/require-session.ts", {
    "next/headers": { cookies: async () => jar },
    "next/navigation": { redirect: (path) => { throw Object.assign(new Error("redirect"), { destination: path }); } },
    "@/config/routes": { routes: { login: "/login", home: "/" } },
    "@/lib/session-cookie": cookieHelpers,
  }).requireSession;
}

test("verified server session controls access for every role", async (t) => {
  for (const role of ["public", "vendor", "admin"]) {
    t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.ok(url.endsWith("/auth/me"));
      assert.equal(options.cache, "no-store");
      assert.equal(options.headers.cookie, "torrent_session=test-session");
      return Response.json({ role });
    });
    for (const allowed of [["vendor", "admin"], ["admin"]]) {
      if (allowed.includes(role)) assert.equal((await sessionGate()(allowed)).role, role);
      else await assert.rejects(sessionGate()(allowed), (error) => error.destination === "/");
    }
  }
});

test("missing, expired and unavailable sessions redirect to login", async (t) => {
  await assert.rejects(sessionGate({ get: () => undefined })(["admin"]), (error) => error.destination === "/login");
  t.mock.method(globalThis, "fetch", async () => new Response("", { status: 401 }));
  await assert.rejects(sessionGate()(["admin"]), (error) => error.destination === "/login");
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Backend unavailable"); });
  await assert.rejects(sessionGate()(["admin"]), (error) => error.destination === "/login");
});

test("private client query data is cancelled and cleared when a session ends", async () => {
  const { QueryClient } = require("@tanstack/react-query");
  const { clearSessionCache } = loadTs("src/lib/session-cache.ts", {
    "@tanstack/react-query": require("@tanstack/react-query"),
  });
  const client = new QueryClient();
  client.setQueryData(["private", "profile"], { vendorPhone: "555-0100" });
  await clearSessionCache(client);
  assert.equal(client.getQueryData(["private", "profile"]), undefined);
});

test("an API 401 notifies the session provider to clear private state", async (t) => {
  const previousWindow = global.window;
  global.window = new EventTarget();
  t.after(() => {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  });
  const { SESSION_EXPIRED_EVENT } = loadTs("src/lib/session-cache.ts", {
    "@tanstack/react-query": require("@tanstack/react-query"),
  });
  const { api } = loadTs("src/lib/api.ts", {
    "@/lib/log": { logClientError() {} },
    "@/lib/session-cache": { SESSION_EXPIRED_EVENT },
  });
  let expired = false;
  global.window.addEventListener(SESSION_EXPIRED_EVENT, () => { expired = true; });
  t.mock.method(globalThis, "fetch", async () => Response.json({ message: "Not signed in." }, { status: 401 }));

  await assert.rejects(api("/private"), /Not signed in\./);
  assert.equal(expired, true);
});

test("private contact values stay masked until explicitly revealed", () => {
  const { maskPrivateValue } = loadTs("src/lib/mask-private-value.ts");
  assert.equal(maskPrivateValue("owner@example.test"), "••••••••");
  assert.equal(maskPrivateValue("  "), "—");
  assert.equal(maskPrivateValue(null), "—");
});

test("frontend redirects accept local destinations and reject foreign origins", () => {
  const { safeAppPath } = loadTs("src/lib/safe-path.ts");
  assert.equal(safeAppPath("/app/tors?sort=newest"), "/app/tors?sort=newest");
  for (const path of ["//evil.example", "https://evil.example", "/\\evil.example", "/\n/evil.example", "javascript:alert(1)"]) {
    assert.equal(safeAppPath(path), "/");
  }
});
