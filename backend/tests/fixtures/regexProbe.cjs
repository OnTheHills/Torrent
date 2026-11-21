const { parentPort, workerData } = require("node:worker_threads");
const assert = require("node:assert/strict");
require("module-alias/register");

// Run the real parsers in a worker so pathological inputs cannot block the
// test runner. The parent terminates this worker if the CPU budget is exceeded.
const { mode, length, patterns } = workerData;
if (mode === "literal-search") {
  for (const regex of patterns) {
    assert.equal(regex.test("a".repeat(length) + "!"), false);
  }
} else if (mode === "announcement-budget") {
  const { parseAnnouncementBudget } = require("@/utils/torUtils");
  assert.equal(parseAnnouncementBudget("1".repeat(length) + "X"), 0);
} else if (mode === "rss-budget") {
  const { parseBudgetFromText } = require("@/services/tor/api/egpRss/parse");
  assert.equal(parseBudgetFromText("1".repeat(length) + "X"), 0);
} else if (mode === "rss-unclosed-items") {
  const { parseRssItems } = require("@/services/tor/api/egpRss/parse");
  assert.deepEqual(parseRssItems("<rss><channel>" + "<item>".repeat(length) + "</channel></rss>"), []);
} else if (mode === "html-unclosed-tags") {
  const { stripTags } = require("@/services/tor/api/egpRss/parse");
  const input = "<".repeat(length) + "X";
  assert.equal(stripTags(input), input);
} else {
  throw new Error("Unknown regex probe mode");
}
parentPort.postMessage({ ok: true });
