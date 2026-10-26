const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const cookieParser = require("cookie-parser");

const USER = "507f1f77bcf86cd799439011";
const OTHER_USER = "507f1f77bcf86cd799439012";
const PROFILE = "507f1f77bcf86cd799439013";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

test("certificate uploads persist with their profile and enforce ownership and PNG validation", async (t) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "torrent-certificates-"));
  const directory = path.join(temporaryRoot, "upload");
  const listFiles = () => fs.readdir(directory).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  process.env.CERTIFICATE_UPLOAD_DIR = directory;
  process.env.JWT_SECRET = "certificate-upload-test-secret";
  const VendorProfile = require("../src/models/VendorProfile");
  const repository = require("../src/repositories/vendorProfileRepository");
  const matching = require("../src/jobs/matchTors");
  const { signUserToken } = require("../src/utils/session");
  let stored = null;
  let failSave = false;
  let failQueue = false;
  async function persist(data) {
    if (failSave) throw new Error("Database unavailable");
    if (stored && data._create) throw Object.assign(new Error("Duplicate profile"), { code: 11000 });
    const { _create, ...values } = data;
    const model = new VendorProfile({ ...values, _id: PROFILE });
    await model.validate();
    stored = JSON.parse(JSON.stringify(model));
    return stored;
  }
  t.mock.method(repository, "create", (data) => persist({ ...data, _create: true }));
  t.mock.method(repository, "update", (_id, data) => persist({ ...stored, ...data }));
  t.mock.method(repository, "findById", async (id) => id === PROFILE ? stored : null);
  t.mock.method(repository, "findByUserId", async (id) => stored?.userId === id ? stored : null);
  t.mock.method(matching, "enqueueEligibleTors", async () => { if (failQueue) throw new Error("Queue unavailable"); });

  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api/vendor-profiles", require("../src/routes/vendorProfileRoute"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}/api/vendor-profiles`;
  const cookie = (userId = USER) => `torrent_session=${signUserToken({ _id: userId, role: "vendor", email: "test@example.com" })}`;
  const upload = (fields = {}, files = {}) => {
    const form = new FormData();
    form.append("profile", JSON.stringify({ userId: USER, companyName: "Test company", ...fields }));
    for (const [field, uploads] of Object.entries(files)) {
      for (const file of uploads) form.append(field, new Blob([file.buffer ?? PNG], { type: file.type ?? "image/png" }), file.name ?? "certificate.png");
    }
    return form;
  };
  const send = (method, url, body, userId = USER) => fetch(base + url, { method, headers: userId ? { Cookie: cookie(userId) } : {}, body });

  await t.test("model defaults all three path arrays to empty", async () => {
    await assert.rejects(fs.stat(directory), { code: "ENOENT" });
    const profile = new VendorProfile({ userId: USER });
    await profile.validate();
    for (const field of ["securityCertificates", "aiCertificates", "otherCertificates"]) assert.deepEqual([...profile[field]], []);
  });

  await t.test("unauthenticated uploads are rejected before files are saved", async () => {
    const response = await send("POST", "", upload({}, { securityCertificates: [{}] }), null);
    assert.equal(response.status, 401);
    assert.deepEqual(await listFiles(), []);
  });

  await t.test("a bad file rejects the complete batch without saving images or profile", async () => {
    const response = await send("POST", "", upload({}, { securityCertificates: [{}], aiCertificates: [{ buffer: Buffer.from("not a png") }] }));
    assert.equal(response.status, 400);
    assert.equal(stored, null);
    assert.deepEqual(await listFiles(), []);
  });

  await t.test("PNG headers with corrupted chunks are rejected", async () => {
    const damaged = Buffer.from(PNG);
    damaged[45] ^= 1;
    const response = await send("POST", "", upload({}, { securityCertificates: [{ buffer: damaged }] }));
    assert.equal(response.status, 400);
    assert.deepEqual(await listFiles(), []);
  });

  await t.test("oversized files and incorrect MIME types are rejected", async () => {
    let response = await send("POST", "", upload({}, { securityCertificates: [{ buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }] }));
    assert.equal(response.status, 413);
    response = await send("POST", "", upload({}, { securityCertificates: [{ type: "image/jpeg" }] }));
    assert.equal(response.status, 400);
    assert.deepEqual(await listFiles(), []);
  });

  await t.test("profile owner IDs and arbitrary paths cannot be supplied by the client", async () => {
    let response = await send("POST", "", upload({ userId: OTHER_USER }));
    assert.equal(response.status, 403);
    response = await send("POST", "", upload({ securityCertificates: ["upload/elsewhere.png"] }));
    assert.equal(response.status, 400);
  });

  await t.test("a missing upload folder is created and all images save with the required filenames", async () => {
    const response = await send("POST", "", upload({}, { securityCertificates: [{}, {}], aiCertificates: [{}], otherCertificates: [{}] }));
    assert.equal(response.status, 201);
    const data = await response.json();
    for (const [field, category] of Object.entries({ securityCertificates: "security", aiCertificates: "ai", otherCertificates: "other" })) {
      assert.equal(data[field].length, field === "securityCertificates" ? 2 : 1);
      for (const storedPath of data[field]) {
        assert.match(storedPath, new RegExp(`^upload/\\d+_${category}_${USER}\\.png$`));
        assert.deepEqual(await fs.readFile(path.join(directory, path.basename(storedPath))), PNG);
      }
    }
    assert.equal((await listFiles()).length, 4);
  });

  await t.test("saved certificates reload and can be viewed only by their owner or an admin", async () => {
    const filename = path.basename(stored.securityCertificates[0]);
    const reloaded = await send("GET", `/get/${USER}`);
    assert.deepEqual((await reloaded.json()).securityCertificates, stored.securityCertificates);
    const response = await send("GET", `/certificates/${filename}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
    assert.equal((await send("GET", `/certificates/${filename}`, undefined, OTHER_USER)).status, 403);
    assert.equal((await send("GET", `/certificates/${filename}`, undefined, null)).status, 401);
  });

  await t.test("another user cannot change a profile", async () => {
    const before = await listFiles();
    assert.equal((await send("PATCH", `/${PROFILE}`, upload({}, { aiCertificates: [{}] }), OTHER_USER)).status, 403);
    assert.deepEqual(await listFiles(), before);
  });

  await t.test("database failure removes new files and preserves the existing profile", async () => {
    const before = await listFiles();
    const paths = [...stored.aiCertificates];
    failSave = true;
    const response = await send("PATCH", `/${PROFILE}`, upload({}, { aiCertificates: [{}] }));
    failSave = false;
    assert.equal(response.status, 500);
    assert.deepEqual(await listFiles(), before);
    assert.deepEqual(stored.aiCertificates, paths);
  });

  await t.test("updates retain omitted arrays, remove selected images, and append new images", async () => {
    const removed = stored.securityCertificates[0];
    const kept = stored.securityCertificates[1];
    const ai = [...stored.aiCertificates];
    const response = await send("PATCH", `/${PROFILE}`, upload({ securityCertificates: [kept] }, { otherCertificates: [{}] }));
    assert.equal(response.status, 200);
    assert.deepEqual(stored.securityCertificates, [kept]);
    assert.deepEqual(stored.aiCertificates, ai);
    assert.equal(stored.otherCertificates.length, 2);
    await assert.rejects(fs.stat(path.join(directory, path.basename(removed))), { code: "ENOENT" });
    assert.equal((await send("GET", `/certificates/${path.basename(removed)}`)).status, 404);
  });

  await t.test("the category limit includes retained files", async () => {
    const before = await listFiles();
    const response = await send("PATCH", `/${PROFILE}`, upload({}, { otherCertificates: [{}, {}, {}, {}] }));
    assert.equal(response.status, 400);
    assert.deepEqual(await listFiles(), before);
  });

  await t.test("duplicate profile saves clean up their new files", async () => {
    const before = await listFiles();
    const response = await send("POST", "", upload({}, { aiCertificates: [{}] }));
    assert.equal(response.status, 409);
    assert.deepEqual(await listFiles(), before);
  });

  await t.test("a matching queue failure does not undo a successful profile save", async () => {
    failQueue = true;
    const response = await send("PATCH", `/${PROFILE}`, upload({ companyName: "Saved even if queue fails" }));
    failQueue = false;
    assert.equal(response.status, 200);
    assert.equal(stored.companyName, "Saved even if queue fails");
  });
});
