#!/usr/bin/env bash
# Regenerate CycloneDX SBOMs for ASVS V15.1.2 evidence.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/document/sbom"
mkdir -p "$out"

npm --prefix "$root/backend" sbom --sbom-format cyclonedx --package-lock-only > "$out/backend-cyclonedx.json"
npm --prefix "$root/frontend" sbom --sbom-format cyclonedx --package-lock-only > "$out/frontend-cyclonedx.json"

echo "Wrote:"
ls -la "$out"/*.json
