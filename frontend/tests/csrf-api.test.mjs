import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function loadApi() {
  const filename = fileURLToPath(new URL("../src/lib/api.ts", import.meta.url));
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.require = require;
  loaded._compile(outputText, filename);
  return loaded.exports;
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test("public reads do not fetch a CSRF token", async (t) => {
  const { api } = loadApi();
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => { calls.push(new URL(url).pathname); return json([]); });
  assert.deepEqual(await api("/tors"), []);
  assert.deepEqual(calls, ["/api/tors"]);
});

test("writes automatically fetch, cache, and send CSRF tokens with cookies", async (t) => {
  const { api } = loadApi();
  let tokenRequests = 0;
  const writes = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.credentials, "include");
    if (new URL(url).pathname === "/api/auth/csrf") {
      tokenRequests++;
      assert.equal(options.cache, "no-store");
      return json({ csrfToken: "test-csrf-token" });
    }
    writes.push(options);
    assert.equal(options.headers.get("x-csrf-token"), "test-csrf-token");
    return json({ ok: true });
  });
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    await api("/example", { method, body: JSON.stringify({ name: "test" }) });
  }
  assert.equal(tokenRequests, 1);
  assert.equal(writes.length, 4);
});

test("multipart uploads retain their browser-generated Content-Type and custom headers", async (t) => {
  const { api } = loadApi();
  const form = new FormData();
  form.append("profile", "{}");
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (new URL(url).pathname.endsWith("/csrf")) return json({ csrfToken: "test-token" });
    assert.equal(options.body, form);
    assert.equal(options.headers.has("Content-Type"), false);
    assert.equal(options.headers.get("x-csrf-token"), "test-token");
    assert.equal(options.headers.get("Accept"), "application/json");
    return json({ ok: true });
  });
  await api("/vendor-profiles", { method: "POST", body: form, headers: new Headers({ Accept: "application/json" }) });
});

test("simultaneous writes share one token request", async (t) => {
  const { api } = loadApi();
  let tokenRequests = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (new URL(url).pathname.endsWith("/csrf")) {
      tokenRequests++;
      await new Promise((resolve) => setImmediate(resolve));
      return json({ csrfToken: "shared-token" });
    }
    return json({ ok: true });
  });
  await Promise.all([api("/first", { method: "POST" }), api("/second", { method: "PATCH" })]);
  assert.equal(tokenRequests, 1);
});

test("login/logout invalidate the cached token for the next session", async (t) => {
  const { api } = loadApi();
  let tokens = 0;
  const sentTokens = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (new URL(url).pathname.endsWith("/csrf")) return json({ csrfToken: `token-${++tokens}` });
    sentTokens.push(options.headers.get("x-csrf-token"));
    return json({ ok: true });
  });
  await api("/auth/google", { method: "POST" });
  await api("/example", { method: "PATCH" });
  await api("/auth/logout", { method: "POST" });
  await api("/auth/google", { method: "POST" });
  assert.deepEqual(sentTokens, ["token-1", "token-2", "token-2", "token-3"]);
});

test("a stale CSRF token is refreshed and retried once", async (t) => {
  const { api } = loadApi();
  let tokens = 0;
  let writes = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (new URL(url).pathname.endsWith("/csrf")) return json({ csrfToken: `token-${++tokens}` });
    writes++;
    assert.equal(options.headers.get("x-csrf-token"), `token-${writes}`);
    return writes === 1 ? json({ code: "INVALID_CSRF_TOKEN", message: "Invalid CSRF token." }, 403) : json({ ok: true });
  });
  assert.deepEqual(await api("/example", { method: "POST" }), { ok: true });
  assert.equal(writes, 2);
  assert.equal(tokens, 2);
});

test("persistent CSRF failures stop after one retry; permission/origin failures are never retried", async (t) => {
  for (const code of ["INVALID_CSRF_TOKEN", "INVALID_ORIGIN", "FORBIDDEN"]) {
    const { api } = loadApi();
    let writes = 0;
    const mock = t.mock.method(globalThis, "fetch", async (url) => {
      if (new URL(url).pathname.endsWith("/csrf")) return json({ csrfToken: "test-token" });
      writes++;
      return json({ code, message: "Denied" }, 403);
    });
    await assert.rejects(api("/example", { method: "POST" }), (error) => error.status === 403 && error.code === code);
    assert.equal(writes, code === "INVALID_CSRF_TOKEN" ? 2 : 1);
    mock.mock.restore();
  }
});

test("token-fetch failures do not send a mutation and can recover on the next call", async (t) => {
  const { api } = loadApi();
  let tokens = 0;
  let writes = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (new URL(url).pathname.endsWith("/csrf")) {
      return ++tokens === 1 ? json({}, 503) : json({ csrfToken: "recovered-token" });
    }
    writes++;
    return json({ ok: true });
  });
  await assert.rejects(api("/example", { method: "POST" }), /Could not establish request protection/);
  assert.equal(writes, 0);
  await api("/example", { method: "POST" });
  assert.equal(writes, 1);
});
