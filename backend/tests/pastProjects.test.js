const assert = require("node:assert/strict");
const { test } = require("node:test");
const VendorProfile = require("../src/models/VendorProfile");
const { matchPrompt } = require("../src/services/tor/matchWithVertex");

test("structured past projects retain types and optional completion date", async () => {
  const profile = new VendorProfile({
    userId: "507f1f77bcf86cd799439011",
    pastProjects: [{ name: "Portal", description: "Public service portal", budget: 1500000, isGovernment: true }],
  });
  await profile.validate();
  assert.deepEqual(profile.pastProjects[0].toObject(), {
    name: "Portal", description: "Public service portal", budget: 1500000,
    isGovernment: true, completedAt: null, urls: [],
  });
  profile.pastProjects[0].budget = -1;
  await assert.rejects(profile.validate(), (error) => Boolean(error.errors["pastProjects.0.budget"]));
});

test("legacy database strings hydrate as structured records without inventing details", () => {
  const profile = VendorProfile.hydrate({ pastProjects: ["Existing portal"] });
  assert.equal(profile.pastProjects[0].name, "Existing portal");
  assert.equal(profile.pastProjects[0].budget, null);
  assert.equal(profile.pastProjects[0].isGovernment, null);
  assert.equal(profile.pastProjects[0].completedAt, null);
});

test("matching preserves project metadata and TOR budget, including zero and false", () => {
  const prompt = matchPrompt({ pastProjects: [
    { name: "Portal", description: "Built a portal", budget: 0, isGovernment: false, completedAt: "2025-04-01" },
    "Legacy project",
  ] }, { title: "Government portal", budgetThb: 2000000 });
  const vendor = JSON.parse(prompt.split("\nVendor: ")[1].split("\nTOR: ")[0]);
  const tor = JSON.parse(prompt.split("\nTOR: ")[1]);
  assert.deepEqual(vendor.pastProjects[0], {
    name: "Portal", description: "Built a portal", budget: 0,
    budgetCurrency: "THB", isGovernment: false, completedAt: "2025-04-01",
    urls: [],
  });
  assert.deepEqual(vendor.pastProjects[1], { name: "Legacy project" });
  assert.equal(tor.budget, 2000000);
});
