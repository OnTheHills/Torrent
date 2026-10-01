import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Docker and a host `next dev` both mount ./frontend; keep their caches apart.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // A leftover lockfile at the repo root makes Turbopack treat Torrent/ as
  // the app and then drop client modules from the RSC manifest.
  turbopack: {
    root: frontendRoot,
  },
};

export default nextConfig;
