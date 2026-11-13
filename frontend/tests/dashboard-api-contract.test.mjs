import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const backendRequire = createRequire(new URL("../../backend/package.json", import.meta.url));
backendRequire("module-alias").addAlias("@", fileURLToPath(new URL("../../backend/src", import.meta.url)));
const TOR = backendRequire("./src/models/tor/TOR");
const router = backendRequire("./src/routes/torRoute");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

function loadSource(relativePath, replacements = {}) {
  const filename = fileURLToPath(new URL(relativePath, import.meta.url));
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  });
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.require = (name) => name in replacements ? replacements[name] : require(name);
  loaded._compile(outputText, filename);
  return loaded.exports;
}

const api = loadSource("../src/lib/api.ts");
const { dictionary } = loadSource("../src/lib/i18n/dictionary.ts");

// Exercise the actual registered controller and frontend fetch utility together.
// Only MongoDB results and the network transport are substituted. Query
// correctness is covered by the existing controller-pipeline MongoDB tests.
function connectControllerTransport(t, path, aggregateResult) {
  const route = router.stack.find((layer) => layer.route?.path === path)?.route;
  assert.ok(route?.methods.get, `Missing backend GET route ${path}`);
  const aggregate = t.mock.method(TOR, "aggregate", async () => aggregateResult);
  const request = t.mock.method(globalThis, "fetch", async (url, config) => {
    assert.equal(new URL(url).pathname, `/api/tors${path}`);
    assert.equal(config.method ?? "GET", "GET");
    assert.equal(config.credentials, "include");
    assert.equal(config.cache, "no-store");
    const response = {
      statusCode: 200,
      set() { return this; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await route.stack.at(-1).handle({}, response);
    return new Response(JSON.stringify(response.body), { status: response.statusCode });
  });
  return { aggregate, request };
}

function renderChart(file, componentName, data, clientFunction) {
  const exports = loadSource(file, {
    "@tanstack/react-query": { useQuery: (options) => {
      assert.equal(options.queryFn, clientFunction);
      return { data, isPending: false, isError: false };
    } },
    "@/components/providers/locale-provider": { useLocale: () => ({ locale: "en", t: (key) => dictionary.en[key] }) },
    "@/components/ui/button": { Button: ({ children }) => React.createElement("button", null, children) },
    "@/lib/api": api,
  });
  return renderToStaticMarkup(React.createElement(exports[componentName]));
}

test("department controller response matches frontend GET utility and chart fields", async (t) => {
  const expected = { departments: [{ department: "กรมทดสอบ", totalBudget: 1250000.5, torCount: 17 }] };
  const { aggregate, request } = connectControllerTransport(t, "/top-departments-by-budget", expected.departments);
  const result = await api.fetchTopDepartmentsByBudget({ signal: new AbortController().signal });
  assert.deepEqual(result, expected);
  assert.equal(request.mock.callCount(), 1);
  assert.equal(aggregate.mock.callCount(), 1);
  const html = renderChart("../src/components/dashboard/department-budget-chart.tsx", "DepartmentBudgetChart", result, api.fetchTopDepartmentsByBudget);
  assert.match(html, /กรมทดสอบ/);
  assert.match(html, /1,250,000.5 THB/);
  assert.match(html, /17 TOR records/);
});

test("category controller response matches frontend GET utility and unchanged chart frequencies", async (t) => {
  const expected = { categories: [{ category: "Web Application", frequency: 4 }, { category: "Others", frequency: 12 }] };
  connectControllerTransport(t, "/category-distribution", [expected]);
  const result = await api.fetchCategoryDistribution({ signal: new AbortController().signal });
  assert.deepEqual(result, expected);
  const html = renderChart("../src/components/dashboard/category-distribution-chart.tsx", "CategoryDistributionChart", result, api.fetchCategoryDistribution);
  assert.match(html, /data-category-bar="Web Application" data-frequency="4"/);
  assert.match(html, /data-category-bar="Others" data-frequency="12"/);
  assert.ok(html.indexOf('data-category-bar="Web Application"') < html.indexOf('data-category-bar="Others"'));
  assert.match(html, /Number of TORs: 12/);
});

for (const endpoint of [
  { path: "/top-departments-by-budget", client: api.fetchTopDepartmentsByBudget, empty: [], expected: { departments: [] } },
  { path: "/category-distribution", client: api.fetchCategoryDistribution, empty: [{ categories: [] }], expected: { categories: [] } },
]) {
  test(`${endpoint.path}: empty response and backend errors reach the frontend correctly`, async (t) => {
    const { aggregate } = connectControllerTransport(t, endpoint.path, endpoint.empty);
    const signal = new AbortController().signal;
    assert.deepEqual(await endpoint.client({ signal }), endpoint.expected);
    aggregate.mock.mockImplementation(async () => { throw new Error("Database unavailable"); });
    await assert.rejects(endpoint.client({ signal }), (error) => {
      assert.equal(error.status, 500);
      assert.equal(error.message, "Database unavailable");
      return true;
    });
  });
}
