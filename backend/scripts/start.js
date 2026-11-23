const fs = require("node:fs");
const path = require("node:path");

const output = path.resolve(__dirname, "../dist");
if (!fs.existsSync(path.join(output, "server.js"))) {
  throw new Error("Backend build is missing. Run npm run build before npm run start.");
}

// Register first so server.js cannot replace the compiled alias with src/.
require("module-alias/register");
require("module-alias").addAlias("@", output);
require(path.join(output, "server.js"));
