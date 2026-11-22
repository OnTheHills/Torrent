const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Exercise real control flow with isolated clocks, providers and repositories.
// No live databases, external APIs, credentials or expensive document parsing.
function load(file, dependencies = {}, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(path.join(__dirname, "../src", file), "utf8"), {
    module, Buffer, URL, Request, AbortController, Date, setTimeout, clearTimeout,
    console: { log() {}, error() {} },
    process: { env: {}, cwd: () => process.cwd() },
    require(name) {
      return Object.hasOwn(dependencies, name) ? dependencies[name] : require(name);
    },
    ...globals,
  }, { filename: file });
  return module.exports;
}

function response() {
  return {
    headers: {}, statusCode: 200,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("V15.2.2: burst throttling stops downstream work, isolates clients and recovers", () => {
  let now = 1000;
  const { createRateLimiter } = load("middleware/rateLimit.js", {
    "@/utils/securityLog": { securityLog() {} },
  }, { Date: { now: () => now } });
  const limit = createRateLimiter({ max: 3, windowMs: 1000 });
  let work = 0;
  const call = (ip) => {
    const res = response();
    limit({ ip }, res, () => { work++; });
    return res;
  };
  for (let i = 0; i < 3; i++) assert.equal(call("client-a").statusCode, 200);
  for (let i = 0; i < 20; i++) {
    const blocked = call("client-a");
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.body.code, "RATE_LIMITED");
    assert.equal(blocked.headers["Retry-After"], "1");
  }
  assert.equal(work, 3);
  assert.equal(call("client-b").statusCode, 200);
  now = 2000;
  assert.equal(call("client-a").statusCode, 200);
  assert.equal(work, 5);
});

test("V15.2.2: oversized upload is rejected before consuming or parsing its body", async () => {
  const { MAX_UPLOAD_SIZE } = require("@/constants/vendorCertificateConstants");
  const { certificateUpload } = require("@/middleware/certificateUpload");
  let reads = 0;
  let downstream = 0;
  const request = {
    is: () => true,
    headers: { "content-length": String(MAX_UPLOAD_SIZE + 1) },
    async *[Symbol.asyncIterator]() { reads++; throw new Error("Body must not be read"); },
  };
  const res = response();
  await certificateUpload(request, res, () => { downstream++; });
  assert.equal(res.statusCode, 413);
  assert.equal(reads, 0);
  assert.equal(downstream, 0);
  await certificateUpload({ is: () => false }, response(), () => { downstream++; });
  assert.equal(downstream, 1);
});

test("V15.2.2: upstream stream is canceled at its byte budget and later reads still work", async () => {
  const { readBoundedBytes } = require("@/utils/boundedText");
  let canceled = false;
  let pulls = 0;
  const stream = new ReadableStream({
    pull(controller) { pulls++; controller.enqueue(Buffer.alloc(8)); },
    cancel() { canceled = true; },
  }, { highWaterMark: 0 });
  await assert.rejects(readBoundedBytes(new Response(stream), 12), { code: "UPSTREAM_BODY_TOO_LARGE" });
  assert.equal(canceled, true);
  assert.equal(pulls, 2);
  assert.equal((await readBoundedBytes(new Response("valid"), 12)).toString(), "valid");
});

test("V15.2.2: OCR caps work per sync, runs serially and continues after one extraction fails", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let downloads = 0;
  let active = 0;
  let peak = 0;
  let extractions = 0;
  const saved = [];
  const ocr = load("services/tor/ocr/ocrEgp.js", {
    "@/utils/torFetch": {
      async fetchTorUrl() {
        downloads++;
        active++;
        peak = Math.max(peak, active);
        if (downloads === 1) await gate;
        return { ok: true, async arrayBuffer() { active--; return Buffer.from("%PDF fixture"); } };
      },
    },
    "@/services/tor/ocr/extractPlanPdf": {
      SUMMARY_VERSION: 1,
      async extractPlanPdf() {
        extractions++;
        if (extractions === 1) throw new Error("Malformed PDF fixture");
        return { ok: true, method: "text", extract: { summary: "Valid TOR" } };
      },
    },
    "@/repositories/tor/torRepository": {
      findBySource: async () => [],
      async saveOcr(refId, _source, fields) { saved.push({ refId, ...fields }); return { _id: refId }; },
    },
  }, { process: { env: { OCR_MAX_PER_SYNC: "2" } } });
  const rows = Array.from({ length: 8 }, (_, i) => ({ refId: `tor-${i}`, documentUrl: `https://example.test/${i}.pdf` }));
  const pending = ocr.enrich(rows);
  try {
    await new Promise(setImmediate);
    assert.equal(downloads, 1, "Second download must wait for the first OCR item");
  } finally {
    release();
  }
  const summary = await pending;
  assert.equal(downloads, 2);
  assert.equal(peak, 1);
  assert.equal(summary.ocrAttempted, 2);
  assert.equal(summary.ocrFailed, 1);
  assert.equal(summary.ocrUpdated, 1);
  assert.equal(summary.ocrSkipped, 6);
  assert.deepEqual(saved.map((row) => row.status), ["failed", "ok"]);
});

test("V15.2.2: PDF parser resources are released after errors and successful extraction", async () => {
  let constructed = 0;
  let destroyed = 0;
  const pdf = load("services/tor/ocr/readPdfText.js", {
    "pdf-parse": {
      PDFParse: class {
        constructor() { this.fail = ++constructed === 1; }
        async getText() {
          if (this.fail) throw new Error("Malformed PDF fixture");
          return { text: "  Valid TOR text  " };
        }
        async destroy() { destroyed++; }
      },
    },
  });
  await assert.rejects(pdf.readPdfText(Buffer.from("bad")), /Malformed PDF/);
  assert.equal(destroyed, 1);
  assert.equal(await pdf.readPdfText(Buffer.from("valid")), "Valid TOR text");
  assert.equal(destroyed, 2);
});

test("V15.2.2: Vertex deadline aborts pending work, clears timers and permits a later request", async () => {
  const timers = new Map();
  let timerId = 0;
  let calls = 0;
  let firstSignal;
  function FakeGoogleGenAI() {
    this.models = {
      generateContent({ config }) {
        if (++calls > 1) return Promise.resolve({ text: "recovered" });
        firstSignal = config.abortSignal;
        return new Promise((_resolve, reject) => {
          firstSignal.addEventListener("abort", () => reject(Object.assign(new Error("Operation aborted"), { name: "AbortError" })), { once: true });
        });
      },
    };
  }
  const vertex = load("services/ai/vertexClient.js", {
    "@google/genai": { GoogleGenAI: FakeGoogleGenAI },
    "node:fs": { existsSync: () => true },
  }, {
    process: { env: {
      GOOGLE_CLOUD_PROJECT: "test-project", VERTEX_LOCATION: "test-location",
      VERTEX_MODEL: "test-model", GOOGLE_APPLICATION_CREDENTIALS: "/test/credentials.json",
    }, cwd: () => "/test" },
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  const pending = vertex.generateText({ prompt: "test", timeoutMs: 25 });
  assert.equal(timers.size, 1);
  const deadline = [...timers.values()][0];
  assert.equal(deadline.ms, 25);
  deadline.fn();
  assert.equal(firstSignal.aborted, true);
  assert.equal((await pending).code, "TIMEOUT");
  assert.equal(timers.size, 0);
  const next = await vertex.generateText({ prompt: "test", timeoutMs: 25 });
  assert.equal(next.ok, true);
  assert.equal(next.text, "recovered");
  assert.equal(timers.size, 0);
});
