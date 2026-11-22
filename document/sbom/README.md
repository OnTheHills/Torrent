# TORRENT Software Bill of Materials (SBOM)

CycloneDX 1.5 inventories generated from npm lockfiles for ASVS **V15.1.2**.

| File | Package tree |
| --- | --- |
| `backend-cyclonedx.json` | `backend/package-lock.json` |
| `frontend-cyclonedx.json` | `frontend/package-lock.json` |

## Regenerate

From the repository root:

```bash
./scripts/generate-sbom.sh
```

Requires npm that supports `npm sbom` (npm 10+).

## Policy

See [Secure-Coding-Architecture.md](../Secure-Coding-Architecture.md) and [dependency-management.md](../dependency-management.md).
