import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

// Render the actual TSX with the existing React server renderer. Only the data
// query and app context are substituted; no browser/test dependency is needed.
function loadSource(relativePath, replacements = {}) {
  const filename = fileURLToPath(new URL(relativePath, import.meta.url));
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.require = (name) => name in replacements ? replacements[name] : require(name);
  loaded._compile(compiled, filename);
  return loaded.exports;
}

const { dictionary } = loadSource("../src/lib/i18n/dictionary.ts");
let query;
let options;
const { DepartmentBudgetChart } = loadSource("../src/components/dashboard/department-budget-chart.tsx", {
  "@tanstack/react-query": { useQuery: (value) => { options = value; return query; } },
  "@/components/providers/locale-provider": { useLocale: () => ({ locale: "en", t: (key) => dictionary.en[key] }) },
  "@/components/ui/button": { Button: ({ children, onClick }) => React.createElement("button", { onClick }, children) },
  "@/lib/api": { fetchTopDepartmentsByBudget: () => {} },
});
const render = (state) => {
  query = state;
  return renderToStaticMarkup(React.createElement(DepartmentBudgetChart));
};

test("renders loading, empty and retryable error states", () => {
  assert.match(render({ isPending: true }), /role="status"/);
  assert.match(render({ data: { departments: [] } }), /No departments with valid positive/);
  const error = render({ isError: true, refetch() {} });
  assert.match(error, /role="alert"/);
  assert.match(error, /Try again/);
});

test("renders budget ranking, full names, THB tooltips and compact amounts", () => {
  const html = render({ data: { departments: [
    { department: "High volume low budget", totalBudget: 1000, torCount: 500 },
    { department: "Full department name for the highest advertised budget", totalBudget: 2500000000, torCount: 1 },
    { department: "Middle budget", totalBudget: 1500000, torCount: 20 },
  ] } });
  assert.ok(html.indexOf("Full department name for the highest") < html.indexOf("Middle budget"));
  assert.ok(html.indexOf("Middle budget") < html.indexOf("High volume low budget"));
  assert.match(html, /2.5B THB/);
  assert.match(html, /1.5M THB/);
  assert.match(html, /1K THB/);
  assert.match(html, /2,500,000,000 THB/);
  assert.match(html, /500 TOR records/);
  assert.match(html, /role="tooltip"/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /not actual government expenditure/);
  assert.equal(options.refetchInterval, 60_000);
});

test("keeps last loaded data visible when a refresh fails", () => {
  const html = render({ isError: true, data: { departments: [
    { department: "Available department", totalBudget: 50, torCount: 2 },
  ] } });
  assert.match(html, /Showing the last available department budgets/);
  assert.match(html, /Available department/);
});
