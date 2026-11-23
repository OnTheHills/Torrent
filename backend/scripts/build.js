const fs = require("node:fs/promises");
const path = require("node:path");
const esbuild = require("esbuild");

async function main() {
  const root = path.resolve(__dirname, "..");
  const source = path.join(root, "src");
  const output = path.join(root, "dist");
  const files = await fs.readdir(source, { recursive: true });
  // Keep the source layout: dynamic source adapters and relative asset paths
  // depend on each module's __dirname. Runtime packages stay in node_modules.
  await fs.rm(output, { recursive: true, force: true });
  await esbuild.build({
    entryPoints: files.filter((file) => file.endsWith(".js")).map((file) => path.join(source, file)),
    outbase: source,
    outdir: output,
    bundle: false,
    platform: "node",
    format: "cjs",
    target: "node22",
    sourcemap: true,
  });
  console.log("Backend built in dist/.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
