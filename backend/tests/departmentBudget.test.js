const assert = require("node:assert/strict");
const { test } = require("node:test");
const { MongoClient } = require("mongodb");
const TOR = require("@/models/tor/TOR");
const controller = require("@/controllers/tor/torController");

function response() {
  return {
    statusCode: null, body: null, headers: {},
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("budget controller returns the response contract and handles database failures", async (t) => {
  const departments = [{ department: "Example", totalBudget: 100, torCount: 2 }];
  t.mock.method(TOR, "aggregate", async () => departments);
  const success = response();
  await controller.getTopDepartmentsByBudget({}, success);
  assert.equal(success.statusCode, 200);
  assert.deepEqual(success.body, { departments });
  assert.equal(success.headers["Cache-Control"], "no-store");
  TOR.aggregate.mock.mockImplementation(async () => { throw new Error("Database unavailable"); });
  const failure = response();
  await controller.getTopDepartmentsByBudget({}, failure);
  assert.equal(failure.statusCode, 500);
  assert.deepEqual(failure.body, { message: "Database unavailable" });
});

test("new static GET route takes precedence over the TOR ID route", () => {
  const router = require("@/routes/torRoute");
  const routes = router.stack.filter((layer) => layer.route).map((layer) => layer.route);
  const index = routes.findIndex((route) => route.path === "/top-departments-by-budget");
  assert.ok(index >= 0);
  assert.equal(routes[index].methods.get, true);
  assert.ok(index < routes.findIndex((route) => route.path === "/:id"));
  assert.equal(routes[index].stack.at(-1).handle, controller.getTopDepartmentsByBudget);
});

// Opt in to real MongoDB verification. $documents supplies fixtures directly to
// the aggregation engine: no fixture collection, inserts, or data cleanup.
test("MongoDB aggregation: budget ranking, identity, invalid values, counts and top-ten limit", {
  skip: !process.env.TOR_AGGREGATION_TEST_URI && "Set TOR_AGGREGATION_TEST_URI to run the MongoDB integration test",
}, async (t) => {
  let pipeline;
  t.mock.method(TOR, "aggregate", async (stages) => { pipeline = stages; return []; });
  await controller.getTopDepartmentsByBudget({}, response());
  const client = new MongoClient(process.env.TOR_AGGREGATION_TEST_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  t.after(() => client.close());
  const aggregate = (documents) => client.db("Torrent").aggregate([{ $documents: documents }, ...pipeline]).toArray();
  const row = (department, budgetThb, extra = {}) => ({ department, budgetThb, ...extra });

  await t.test("ranks by THB, includes all statuses and counts invalid budgets safely", async () => {
    const result = await aggregate([
      row("Large", 5000, { status: "draft" }),
      row("Large", "2500.50", { status: "published" }),
      row("Large", 100, { status: "closed" }),
      row("Large", 10, { status: "awarded" }),
      row("Large", 1, { status: "cancelled" }),
      ...[null, "invalid", "NaN", "Infinity", Infinity, -Infinity, NaN, -1000, 0, true, {}, []].map((value) => row("Large", value)),
      { department: "Large" },
      ...Array.from({ length: 30 }, () => row("Frequent", 1)),
      row("Hidden", 1e9, { hidden: true }),
      row("", 1e9), row("   ", 1e9), row(null, 1e9), row(123, 1e9),
      { budgetThb: 1e9 }, row("Zero", 0), row("Invalid", "bad"), row("Negative", -5),
    ]);
    assert.deepEqual(result, [
      { department: "Large", totalBudget: 7611.5, torCount: 18 },
      { department: "Frequent", totalBudget: 30, torCount: 30 },
    ]);
  });

  await t.test("groups complete e-GP identities and normalized fallback names", async () => {
    assert.deepEqual(await aggregate([
      row("Old name", 50, { egpDeptId: "01", egpDeptSubId: "02" }),
      row("New name", 50, { egpDeptId: "01", egpDeptSubId: "02" }),
      row("  Fallback  ", 10), row("fallback", 10),
      row("Sibling", 5, { egpDeptId: "01", egpDeptSubId: "03" }),
    ]), [
      { department: "New name", totalBudget: 100, torCount: 2 },
      { department: "Fallback", totalBudget: 20, torCount: 2 },
      { department: "Sibling", totalBudget: 5, torCount: 1 },
    ]);
  });

  await t.test("breaks budget ties by count then name, and limits results to ten", async () => {
    const documents = [row("Zulu", 100), row("Alpha", 100), row("More records", 50), row("More records", 50)];
    documents.push(...Array.from({ length: 12 }, (_, i) => row(`Small ${i}`, i + 1)));
    const result = await aggregate(documents);
    assert.equal(result.length, 10);
    assert.deepEqual(result.slice(0, 3).map((item) => item.department), ["More records", "Alpha", "Zulu"]);
    assert.equal(result[3].totalBudget, 12);
    assert.equal(result.at(-1).totalBudget, 6);
    assert.deepEqual(await aggregate([]), []);
  });
});
