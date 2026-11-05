import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";
import * as distribution from "../src/lib/budget-distribution.ts";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

// Match the existing department chart tests: render the real component with
// React, substituting only the application locale context and import aliases.
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
const { dictionary } = loadSource("../src/lib/i18n/dictionary.ts");
const { BudgetDistributionChart } = loadSource("../src/components/dashboard/budget-distribution-chart.tsx", {
  "@/components/providers/locale-provider": { useLocale: () => ({ locale: "en", t: (key) => dictionary.en[key] }) },
  "@/lib/budget-distribution": distribution,
});
const render = (props) => renderToStaticMarkup(React.createElement(BudgetDistributionChart, { tors: [], ...props }));

test("renders loading, empty, failed request and stale data states", () => {
  assert.match(render({ isPending: true }), /Loading TOR budget distribution/);
  assert.match(render({}), /No TOR records with valid positive budgets/);
  assert.match(render({ isError: true }), /role="alert"/);
  assert.match(render({ isError: true, isPending: true }), /Unable to load TOR budgets/);
  const stale = render({ isError: true, tors: [{ id: "1", budgetThb: 100 }] });
  assert.match(stale, /Showing the last available TOR budgets/);
  assert.equal((stale.match(/data-budget-bin=/g) ?? []).length, 2);
  assert.match(stale, /&gt; ฿10M/);
});

test("renders eight bars with a Less than first label and fixed > ฿10M final label", () => {
  const html = render({ tors: [100000, 200000, 300000, 400000, 500000, 600000, 10000000, 10000001].map((budgetThb, i) => ({ id: String(i), budgetThb })) });
  assert.equal((html.match(/data-budget-bin=/g) ?? []).length, 8);
  assert.equal((html.match(/role="tooltip"/g) ?? []).length, 8);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 8);
  assert.match(html, /Less than ฿150K/);
  assert.match(html, /&gt; ฿10M/);
  assert.match(html, /Budget Range: \[฿5,300,000, ฿10,000,000\] THB/);
  assert.match(html, /Budget Range: &gt; ฿10,000,000 THB/);
  assert.match(html, /TOR budget ranges \(THB\)/);
  assert.match(html, /identical values stay together/);
});

test("collapsed ranges and a zero-count overflow still display the final label", () => {
  const html = render({ tors: [{ id: "1", budgetThb: 10000000 }] });
  assert.equal((html.match(/data-budget-bin=/g) ?? []).length, 2);
  assert.match(html, /≤ ฿10M/);
  assert.match(html, /&gt; ฿10M/);
  assert.match(html, /Number of TORs: 0/);
});
