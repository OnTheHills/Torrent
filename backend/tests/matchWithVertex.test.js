const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs/promises");
const { readFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const USER = "507f1f77bcf86cd799439011";
const OTHER_USER = "507f1f77bcf86cd799439012";
const CERTIFICATES = ["security", "ai", "other"].map((category) => ({ category, buffer: PNG }));
const VALID_SCORE = {
  budgetCapacityScore: 20,
  requirementsFitScore: 40,
  securityCertificateBonus: 2,
  aiCertificateBonus: 2,
  otherCertificateBonus: 3,
  matchReason: "งบประมาณเหมาะกับทีม มีผลงานตรงกับข้อกำหนดและมีใบรับรองสนับสนุน",
};

function loadMatching({ certificates = [], score = VALID_SCORE, failure } = {}) {
  const calls = [];
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(path.join(__dirname, "../src/services/tor/matchWithVertex.js"), "utf8"), {
    module,
    process: { env: {} },
    require(name) {
      if (name === "@/services/vendor/certificateStorage") return { readCertificates: async () => certificates };
      if (name === "@/services/ai/vertexClient") return {
        generateFromParts: async (request) => {
          calls.push(request);
          return failure || { ok: true, text: JSON.stringify(score) };
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { ...module.exports, calls };
}

test("prompt separates 30/70 scoring, tier priorities, and the ordered certificate bonus", () => {
  const { matchPrompt } = loadMatching();
  const prompt = matchPrompt({ teamSize: "5", pastProjects: [{ name: "Portal", budget: 0, isGovernment: false }] }, { budgetThb: 2000000 }, CERTIFICATES);
  assert.match(prompt, /budgetCapacityScore \(0-30, 30%\)/);
  assert.match(prompt, /requirementsFitScore \(0-70, 70%\)/);
  assert.match(prompt, /Tier 1 \(highest, equal priority\): requirement satisfaction AND relevant past projects/);
  assert.match(prompt, /if they claim they can do it, but do not have past skill related/);
  assert.match(prompt, /if a relevant project to claim skill/);
  assert.match(prompt, /securityCertificateBonus is an integer 0-2/);
  assert.match(prompt, /aiCertificateBonus is an integer 0-2/);
  assert.match(prompt, /otherCertificateBonus is an integer 0-3/);
  assert.doesNotMatch(prompt, /up to 3 total for this category/);
  assert.match(prompt, /Tier 2: technical skill coverage/);
  assert.match(prompt, /Tier 3: other relevant profile information/);
  assert.match(prompt, /Direct relevance to the TOR is the top priority/);
  const ranking = ["ISO/IEC 29110", "SSL website certificate", "ISO/IEC 17025", "ISO 9001:2015", "ISC2 Certified in Cybersecurity (CC)", "CompTIA PenTest+", "GPEN — GIAC Certified Penetration Tester", "VMware Data Center Virtualization Design Certificate", "other certificates"];
  assert.match(prompt, new RegExp(ranking.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(" > ")));
  assert.match(prompt, /"security":1,"ai":1,"other":1/);
  assert.match(prompt, /ภาษาไทย/);
  const vendor = JSON.parse(prompt.split("\nVendor: ")[1].split("\nTOR: ")[0]);
  assert.equal(vendor.teamSize, "5");
  assert.equal(vendor.pastProjects[0].budget, 0);
  assert.equal(vendor.pastProjects[0].isGovernment, false);
  assert.equal(JSON.parse(prompt.split("\nTOR: ")[1]).budget, 2000000);
});

test("matching sends PNG bytes and category labels with a structured component schema", async () => {
  const { matchWithVertex, calls } = loadMatching({ certificates: CERTIFICATES });
  const result = await matchWithVertex({ userId: USER }, { title: "Portal" });
  assert.equal(result.ok, true);
  assert.equal(result.matchPercent, 67);
  const request = calls[0];
  assert.equal(request.parts.length, 7);
  for (const [index, category] of ["security", "ai", "other"].entries()) {
    assert.match(request.parts[1 + index * 2].text, new RegExp(`category: ${category}`));
    assert.equal(request.parts[2 + index * 2].inlineData.mimeType, "image/png");
    assert.deepEqual(Buffer.from(request.parts[2 + index * 2].inlineData.data, "base64"), PNG);
  }
  assert.equal(request.responseJsonSchema.properties.budgetCapacityScore.maximum, 30);
  assert.equal(request.responseJsonSchema.properties.requirementsFitScore.maximum, 70);
  assert.equal(request.responseJsonSchema.properties.securityCertificateBonus.maximum, 2);
  assert.equal(request.responseJsonSchema.properties.aiCertificateBonus.maximum, 2);
  assert.equal(request.responseJsonSchema.properties.otherCertificateBonus.maximum, 3);
  assert.equal(request.timeoutMs, 60000);
});

test("backend enforces 2/2/3 certificate limits and caps final matches at 100", async () => {
  const oversizedBonus = { securityCertificateBonus: 50, aiCertificateBonus: 50, otherCertificateBonus: 50 };
  let matching = loadMatching({ certificates: CERTIFICATES, score: { ...VALID_SCORE, ...oversizedBonus } });
  assert.equal((await matching.matchWithVertex({}, {})).matchPercent, 67);
  matching = loadMatching({ certificates: CERTIFICATES, score: { ...VALID_SCORE, budgetCapacityScore: 30, requirementsFitScore: 70, ...oversizedBonus } });
  assert.equal((await matching.matchWithVertex({}, {})).matchPercent, 100);
  matching = loadMatching({ score: { ...VALID_SCORE, budgetCapacityScore: 1000, requirementsFitScore: 0 } });
  assert.equal((await matching.matchWithVertex({}, {})).matchPercent, 30);
  matching = loadMatching({ score: { ...VALID_SCORE, budgetCapacityScore: 0, requirementsFitScore: 1000 } });
  assert.equal((await matching.matchWithVertex({}, {})).matchPercent, 70);
});

test("a category without an attached image earns no bonus even if Vertex claims one", async () => {
  let matching = loadMatching();
  assert.equal((await matching.matchWithVertex({}, {})).matchPercent, 60);
  matching = loadMatching({ certificates: [CERTIFICATES[1]] });
  assert.equal((await matching.matchWithVertex({}, {})).matchPercent, 62);
});

test("invalid components are rejected and Vertex failures keep the existing failure contract", async () => {
  for (const value of [-1, 20.5, "20", null, undefined]) {
    const { matchWithVertex } = loadMatching({ score: { ...VALID_SCORE, budgetCapacityScore: value } });
    assert.equal((await matchWithVertex({}, {})).code, "INVALID_RESPONSE");
  }
  const failure = { ok: false, code: "RATE_LIMITED", message: "Try later" };
  const { matchWithVertex } = loadMatching({ failure });
  assert.equal(await matchWithVertex({}, {}), failure);
});

test("certificate loading reads only registered PNGs matching the user and category", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "vertex-certificates-"));
  const previousDirectory = process.env.CERTIFICATE_UPLOAD_DIR;
  process.env.CERTIFICATE_UPLOAD_DIR = directory;
  const { readCertificates } = require("../src/services/vendor/certificateStorage");
  t.mock.method(console, "warn", () => {});
  t.after(async () => {
    await fs.rm(directory, { recursive: true, force: true });
    if (previousDirectory === undefined) delete process.env.CERTIFICATE_UPLOAD_DIR;
    else process.env.CERTIFICATE_UPLOAD_DIR = previousDirectory;
  });

  const paths = {};
  for (const [index, category] of ["security", "ai", "other"].entries()) {
    const filename = `${100 + index}_${category}_${USER}.png`;
    await fs.writeFile(path.join(directory, filename), PNG);
    paths[`${category}Certificates`] = [`upload/${filename}`];
  }
  const foreign = `200_security_${OTHER_USER}.png`;
  const invalid = `201_security_${USER}.png`;
  const linked = `202_security_${USER}.png`;
  const missing = `203_security_${USER}.png`;
  await fs.writeFile(path.join(directory, foreign), PNG);
  await fs.writeFile(path.join(directory, invalid), Buffer.from("not a PNG"));
  await fs.symlink(path.join(directory, foreign), path.join(directory, linked));
  await fs.writeFile(path.join(directory, `204_other_${USER}.png`), PNG); // Not registered in the profile.

  let certificates = await readCertificates({ _id: OTHER_USER, userId: USER, ...paths });
  assert.deepEqual(certificates.map((item) => item.category), ["security", "ai", "other"]);
  for (const certificate of certificates) assert.deepEqual(certificate.buffer, PNG);

  for (const forbidden of [`upload/${foreign}`, `upload/${invalid}`, `upload/${linked}`, `upload/${missing}`, paths.aiCertificates[0], `upload/../${path.basename(paths.securityCertificates[0])}`]) {
    certificates = await readCertificates({ userId: USER, securityCertificates: [forbidden] });
    assert.deepEqual(certificates, []);
  }
  assert.deepEqual(await readCertificates({ _id: USER }), []);
});
