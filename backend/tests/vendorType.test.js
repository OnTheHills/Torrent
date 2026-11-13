const assert = require("node:assert/strict");
const { test } = require("node:test");
const VendorProfile = require("../src/models/vendor/VendorProfile");
const service = require("../src/services/vendor/vendorProfileService");
const controller = require("../src/controllers/vendor/vendorProfileController");
const { matchPrompt } = require("../src/services/tor/matchWithVertex");

const USER = "507f1f77bcf86cd799439011";

test("vendor contact fields survive model serialization and reach Vertex", async () => {
  const contact = { vendorName: "Test vendor", vendorEmail: "vendor@example.com", vendorPhone: "0123456789" };
  const profile = new VendorProfile({ userId: USER, ...contact });
  await profile.validate();
  const saved = profile.toObject();
  for (const [field, value] of Object.entries(contact)) assert.equal(saved[field], value);
  const vendor = JSON.parse(matchPrompt(saved, {}).split("\nVendor: ")[1].split("\nTOR: ")[0]);
  assert.equal(vendor.vendorName, contact.vendorName);
});

test("Vertex receives company team size or individual one-person capacity", () => {
  const promptVendor = (profile) => JSON.parse(
    matchPrompt(profile, {}).split("\nVendor: ")[1].split("\nTOR: ")[0],
  );
  for (const vendorType of ["company", undefined]) {
    const vendor = promptVendor({ vendorType, teamSize: "5" });
    assert.equal(vendor.vendorType, "company");
    assert.equal(vendor.teamSize, "5");
    assert.equal(Object.hasOwn(vendor, "capacity"), false);
  }
  const vendor = promptVendor({ vendorType: "individual", teamSize: "20" });
  assert.equal(vendor.vendorType, "individual");
  assert.equal(vendor.capacity, "This is one person.");
  assert.equal(Object.hasOwn(vendor, "teamSize"), false);
});

test("vendor type defaults to company for new and legacy profiles", async () => {
  const profile = new VendorProfile({ userId: USER });
  await profile.validate();
  assert.equal(profile.vendorType, "company");
  assert.equal(VendorProfile.hydrate({ userId: USER }).vendorType, "company");
});

test("vendor type accepts individual and company and rejects invalid values", async () => {
  for (const vendorType of ["individual", "company"]) {
    const profile = new VendorProfile({ userId: USER, vendorType });
    await profile.validate();
    assert.equal(profile.toObject().vendorType, vendorType);
  }
  for (const vendorType of ["vendor", "", null]) {
    const profile = new VendorProfile({ userId: USER, vendorType });
    await assert.rejects(profile.validate(), (error) => Boolean(error.errors.vendorType));
  }
});

test("create and update controllers pass vendor type to persistence and return it", async (t) => {
  t.mock.method(service, "createVendorProfile", async (data) => data);
  t.mock.method(service, "updateVendorProfile", async (_id, data) => data);
  for (const method of ["createVendorProfile", "updateVendorProfile"]) {
    for (const vendorType of ["individual", "company"]) {
      const response = {
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
      };
      await controller[method]({
        user: { sub: USER },
        params: { id: "507f1f77bcf86cd799439012" },
        body: { vendorType, vendorName: "Test vendor", vendorEmail: "vendor@example.com", vendorPhone: "0123456789" },
      }, response);
      assert.equal(response.statusCode, method === "createVendorProfile" ? 201 : 200);
      assert.equal(response.body.vendorType, vendorType);
      assert.equal(response.body.vendorName, "Test vendor");
      assert.equal(response.body.vendorEmail, "vendor@example.com");
      assert.equal(response.body.vendorPhone, "0123456789");
    }
  }
});
