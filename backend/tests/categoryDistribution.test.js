const assert = require("node:assert/strict");
const { test } = require("node:test");
const { MongoClient } = require("mongodb");
const express = require("express");
const TOR = require("@/models/tor/TOR");
const { getCategoryDistribution } = require("@/controllers/tor/torController");

function response() {
  return {
    headers: {},
    set(key, value) { this.headers[key] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

test("category endpoint returns categories, handles empty results and database errors", async (t) => {
  const categories = [{ category: "Software Development", frequency: 5 }, { category: "Others", frequency: 2 }];
  t.mock.method(TOR, "aggregate", async () => [{ categories }]);
  const success = response();
  await getCategoryDistribution({}, success);
  assert.equal(success.statusCode, 200);
  assert.deepEqual(success.body, { categories });
  assert.equal(success.headers["Cache-Control"], "no-store");
  TOR.aggregate.mock.mockImplementation(async () => []);
  const empty = response();
  await getCategoryDistribution({}, empty);
  assert.deepEqual(empty.body, { categories: [] });
  TOR.aggregate.mock.mockImplementation(async () => { throw new Error("Database unavailable"); });
  const failure = response();
  await getCategoryDistribution({}, failure);
  assert.equal(failure.statusCode, 500);
  assert.deepEqual(failure.body, { message: "Database unavailable" });
});

test("category GET route precedes the dynamic TOR ID route", () => {
  const router = require("@/routes/torRoute");
  const routes = router.stack.filter((layer) => layer.route).map((layer) => layer.route);
  const index = routes.findIndex((route) => route.path === "/category-distribution");
  assert.ok(index >= 0 && index < routes.findIndex((route) => route.path === "/:id"));
  assert.equal(routes[index].methods.get, true);
  assert.equal(routes[index].stack.at(-1).handle, getCategoryDistribution);
});

test("MongoDB computes category ranking and Others, exposed by a successful HTTP GET", {
  skip: !process.env.TOR_AGGREGATION_TEST_URI && "Set TOR_AGGREGATION_TEST_URI to run MongoDB integration tests",
}, async (t) => {
  let pipeline;
  t.mock.method(TOR, "aggregate", async (stages) => { pipeline = stages; return []; });
  await getCategoryDistribution({}, response());
  const client = new MongoClient(process.env.TOR_AGGREGATION_TEST_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  t.after(() => client.close());
  // Collectionless fixture aggregation: no database records are written.
  const aggregate = async (documents) => (await client.db("Torrent").aggregate([{ $documents: documents }, ...pipeline]).toArray())[0].categories;
  const rows = (category, count) => Array.from({ length: count }, () => ({ category }));

  await t.test("top seven sorted by frequency, with tail and stored Others counted once", async () => {
    const documents = Array.from({ length: 9 }, (_, i) => rows(`Category ${i + 1}`, 9 - i)).flat();
    documents.push(...rows("Others", 50), { category: "others" }, { category: "" }, {}, { category: null }, { category: 42 });
    documents.push({ category: "Hidden", hidden: true });
    const categories = await aggregate(documents);
    assert.equal(categories.length, 8);
    assert.deepEqual(categories.slice(0, 7).map((item) => item.frequency), [9, 8, 7, 6, 5, 4, 3]);
    assert.deepEqual(categories.at(-1), { category: "Others", frequency: 58 });
    assert.equal(categories.reduce((sum, item) => sum + item.frequency, 0), documents.length - 1);
  });

  await t.test("ties, trimmed names, all statuses, fewer categories, and empty datasets", async () => {
    assert.deepEqual(await aggregate([
      { category: " Beta ", status: "draft" }, { category: "Beta", status: "awarded" },
      { category: "Alpha", status: "published" }, { category: "Alpha", status: "cancelled" },
    ]), [{ category: "Alpha", frequency: 2 }, { category: "Beta", frequency: 2 }, { category: "Others", frequency: 0 }]);
    assert.deepEqual(await aggregate([{}]), [{ category: "Others", frequency: 1 }]);
    assert.deepEqual(await aggregate([]), []);
  });

  await t.test("GET returns the MongoDB output and a refetch reflects changed input", async () => {
    let documents = rows("Web Application", 2);
    TOR.aggregate.mock.mockImplementation((stages) => client.db("Torrent").aggregate([{ $documents: documents }, ...stages]).toArray());
    const app = express();
    app.use("/api/tors", require("@/routes/torRoute"));
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/api/tors/category-distribution`;
    const first = await fetch(url);
    assert.equal(first.status, 200);
    assert.equal((await first.json()).categories[0].frequency, 2);
    documents = [...documents, { category: "Web Application" }];
    assert.equal((await (await fetch(url)).json()).categories[0].frequency, 3);
  });
});
