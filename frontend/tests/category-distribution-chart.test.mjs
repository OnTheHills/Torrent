import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
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
let query;
let options;
const { CategoryDistributionChart } = loadSource("../src/components/dashboard/category-distribution-chart.tsx", {
  "@tanstack/react-query": { useQuery: (value) => { options = value; return query; } },
  "@/components/providers/locale-provider": { useLocale: () => ({ locale: "en", t: (key) => dictionary.en[key] }) },
  "@/components/ui/button": { Button: ({ children, onClick }) => React.createElement("button", { onClick }, children) },
  "@/lib/api": api,
});
const render = (state) => {
  query = state;
  return renderToStaticMarkup(React.createElement(CategoryDistributionChart));
};

test("API utility requests the specific category endpoint with GET and session credentials", async (t) => {
  const payload = { categories: [{ category: "Web Application", frequency: 23 }] };
  const signal = new AbortController().signal;
  const request = t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => payload }));
  assert.equal(await api.fetchCategoryDistribution({ signal }), payload);
  const [url, config] = request.mock.calls[0].arguments;
  assert.equal(new URL(url).pathname, "/api/tors/category-distribution");
  assert.equal(config.method, "GET");
  assert.equal(config.credentials, "include");
  assert.equal(config.cache, "no-store");
  assert.equal(config.signal, signal);
  assert.equal(request.mock.callCount(), 1);
});

test("renders loading, empty and error states", () => {
  assert.match(render({ isPending: true }), /Loading software category distribution/);
  assert.match(render({ data: { categories: [] } }), /No TOR category data/);
  const error = render({ isError: true, refetch() {} });
  assert.match(error, /role="alert"/);
  assert.match(error, /Try again/);
});

test("renders endpoint frequencies and order directly, retaining Others last even when largest", () => {
  const categories = [{ category: "First from API", frequency: 10 }, { category: "Second from API", frequency: 5 }, { category: "Others", frequency: 100 }];
  const html = render({ data: { categories } });
  assert.equal(options.queryFn, api.fetchCategoryDistribution);
  assert.equal(options.refetchInterval, 60_000);
  assert.ok(html.indexOf('data-category-bar="First from API"') < html.indexOf('data-category-bar="Second from API"'));
  assert.ok(html.indexOf('data-category-bar="Second from API"') < html.indexOf('data-category-bar="Others"'));
  assert.match(html, /data-frequency="10"[^>]*height:10%/);
  assert.match(html, /data-frequency="5"[^>]*height:5%/);
  assert.match(html, /data-frequency="100"[^>]*height:100%/);
  assert.equal((html.match(/role="tooltip"/g) ?? []).length, 3);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 3);
  assert.match(html, /Number of TORs: 100/);
  assert.deepEqual(categories.map((item) => item.frequency), [10, 5, 100]);
});

test("refetched values replace previous bar heights; errors retain available results", () => {
  const before = render({ data: { categories: [{ category: "Web", frequency: 10 }] } });
  const after = render({ data: { categories: [{ category: "Web", frequency: 20 }] }, isError: true });
  assert.match(before, /data-frequency="10"/);
  assert.match(after, /data-frequency="20"/);
  assert.match(after, /Showing the last available category distribution/);
});
