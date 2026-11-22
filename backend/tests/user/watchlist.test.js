const assert = require("node:assert/strict");
const { test } = require("node:test");
const users = require("@/repositories/user/userRepository");
const tors = require("@/repositories/tor/torRepository");
const User = require("@/models/user/User");
const userService = require("@/services/user/userService");

const A = "507f1f77bcf86cd799439011";
const B = "507f1f77bcf86cd799439012";
const C = "507f1f77bcf86cd799439013";
const TOR_ID = "507f1f77bcf86cd799439014";
const OTHER_TOR = "507f1f77bcf86cd799439015";

test("watchlists are private, default empty, and cannot be changed through general user updates", async () => {
  assert.equal(User.schema.path("watchlist").options.select, false);
  const user = new User({ email: "test@example.invalid" });
  assert.deepEqual(user.watchlist.toObject(), []);
  for (const body of [{ watchlist: [TOR_ID] }, { "watchlist.0": TOR_ID }, { $set: { watchlist: [TOR_ID] } }]) {
    await assert.rejects(userService.updateUser(B, body, "admin"), { statusCode: 403 });
  }
});

test("authenticated watchlists isolate public, vendor, and admin users through the real HTTP routes", { timeout: 15000 }, async (t) => {
  for (const [key, value] of Object.entries({
    CORS_ORIGIN: "http://localhost:3000", JWT_SECRET: "watchlist-test-secret",
    CSRF_SECRET: "watchlist-csrf-test-secret", COOKIE_SECURE: "false", NODE_ENV: "test",
    SECRETS_ONLY: "false", RATE_LIMIT_CSRF_MAX: "500",
  })) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => previous === undefined ? delete process.env[key] : process.env[key] = previous);
  }
  const accounts = new Map([
    [A, { _id: A, role: "public", email: "a@example.invalid", watchlist: [] }],
    [B, { _id: B, role: "vendor", email: "b@example.invalid", watchlist: [] }],
    [C, { _id: C, role: "admin", email: "c@example.invalid", watchlist: [] }],
  ]);
  t.mock.method(users, "findAuthById", async (id) => accounts.get(String(id)));
  t.mock.method(tors, "findById", async (id) => id === TOR_ID ? { _id: TOR_ID } : null);
  const chain = (result) => ({ select() { return this; }, async lean() { return result; } });
  t.mock.method(User, "findById", (id) => chain(accounts.get(String(id))));
  t.mock.method(User, "findByIdAndUpdate", (id, update, options) => {
    assert.equal(options.runValidators, true);
    const user = accounts.get(String(id));
    if (!user) return chain(null);
    assert.equal(Object.keys(update).length, 1);
    if (update.$addToSet) {
      assert.deepEqual(update, { $addToSet: { watchlist: TOR_ID } });
      if (!user.watchlist.includes(TOR_ID)) user.watchlist.push(TOR_ID);
    } else {
      assert.ok(update.$pull);
      user.watchlist = user.watchlist.filter((torId) => torId !== update.$pull.watchlist);
    }
    return chain({ ...user, watchlist: [...user.watchlist] });
  });
  const app = require("@/app");
  const { signUserToken, sessionCookieName } = require("@/utils/session");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const path = "/users/me/watchlist";
  async function client(userId) {
    const cookies = new Map([[sessionCookieName(), signUserToken(accounts.get(userId))]]);
    const cookie = () => [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    const response = await fetch(`${base}/auth/csrf`, { headers: { Origin: "http://localhost:3000", Cookie: cookie() } });
    assert.equal(response.status, 200);
    for (const header of response.headers.getSetCookie()) {
      const pair = header.split(";")[0];
      const index = pair.indexOf("=");
      cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    const { csrfToken } = await response.json();
    return async (method, url = path, options = {}) => {
      const response = await fetch(`${base}${url}`, {
        method,
        headers: {
          Cookie: cookie(), Origin: "http://localhost:3000", "Content-Type": "application/json",
          ...(options.csrf === false ? {} : { "x-csrf-token": csrfToken }),
          ...options.headers,
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
      return { status: response.status, body: await response.json(), cacheControl: response.headers.get("cache-control") };
    };
  }
  const a = await client(A), b = await client(B), admin = await client(C);
  assert.equal((await fetch(`${base}${path}`)).status, 401);
  assert.equal((await a("PUT", `${path}/${TOR_ID}`, { csrf: false })).status, 403);
  assert.deepEqual((await a("GET")).body, { savedIds: [] });
  assert.equal((await a("PUT", `${path}/${TOR_ID}`, { body: { userId: B } })).status, 200);
  assert.deepEqual((await a("GET", `${path}?userId=${B}`)).body, { savedIds: [TOR_ID] });
  assert.deepEqual((await b("GET")).body, { savedIds: [] });
  assert.deepEqual((await admin("GET")).body, { savedIds: [] });
  // Idempotent duplicate saves and independent ownership of the same TOR.
  assert.deepEqual((await a("PUT", `${path}/${TOR_ID}`)).body, { savedIds: [TOR_ID] });
  assert.equal((await b("PUT", `${path}/${TOR_ID}`)).status, 200);
  assert.equal((await admin("PUT", `${path}/${TOR_ID}`)).status, 200);
  assert.equal((await a("DELETE", `${path}/${TOR_ID}`, { body: { userId: B } })).status, 200);
  assert.deepEqual((await a("GET")).body, { savedIds: [] });
  assert.deepEqual((await b("GET")).body, { savedIds: [TOR_ID] });
  assert.deepEqual((await admin("GET")).body, { savedIds: [TOR_ID] });
  // Reloading/signing in again restores only that account's persisted list.
  assert.deepEqual((await (await client(B))("GET")).body, { savedIds: [TOR_ID] });
  assert.equal((await b("PUT", `${path}/${TOR_ID}`, { headers: { "x-watchlist-owner": A } })).status, 409);
  assert.equal((await b("GET", path, { headers: { "x-watchlist-owner": A } })).status, 409);
  assert.equal((await b("PUT", `${path}/${OTHER_TOR}`)).status, 404);
  assert.equal((await b("PUT", `${path}/invalid`)).status, 404);
  assert.equal((await admin("PATCH", `/users/${B}`, { body: { watchlist: [] } })).status, 403);
  assert.match((await b("GET")).cacheControl, /private.*no-store/);
  // Removal still succeeds if the original TOR was deleted later.
  t.mock.method(tors, "findById", async () => null);
  assert.deepEqual((await b("DELETE", `${path}/${TOR_ID}`)).body, { savedIds: [] });
  assert.deepEqual((await admin("GET")).body, { savedIds: [TOR_ID] });
});
