# Secure coding and architecture documentation

Reviewed 2026-11-22 for OWASP ASVS 5.0 **V15.1 — Secure Coding and Architecture Documentation** (TS-54).

This document is the architecture evidence hub for V15.1. Related detail lives in:

| Topic | Document |
| --- | --- |
| Remediation timeframes and dependency policy | [dependency-management.md](./dependency-management.md) |
| Full third-party inventory (SBOM) | [sbom/](./sbom/) |
| Resource-heavy operations and defenses | [design.md — Resource availability controls](./design.md#resource-availability-controls) |

## V15.1.1 — Remediation and update timeframes (L1)

**Status:** Documented.

TORRENT defines risk-based remediation windows and a general library update policy in [dependency-management.md](./dependency-management.md):

- Critical ≤ 14 days · High ≤ 30 days · Moderate ≤ 60 days · Low ≤ 90 days
- Routine dependency review at least every 60 days while the project is actively maintained
- Updates are not required solely because a newer version exists

Verification: policy adopted by the project maintainer; timeframes are explicit in §4 of that document.

## V15.1.2 — Third-party inventory / SBOM (L2)

**Status:** Documented and generated.

### Trusted repositories

| Ecosystem | Allowed source | Evidence |
| --- | --- | --- |
| npm (backend + frontend) | `https://registry.npmjs.org` (default npm registry) | No project `.npmrc` overrides registry; lockfile `resolved` URLs use `registry.npmjs.org` |
| Docker base images | Images pinned in Compose / Dockerfiles from official or project-approved registries | Reviewed when images change |
| Node / MongoDB runtimes | Vendor distribution used by local Compose | Reviewed with runtime upgrades |

Private or alternate registries are **not** configured. New dependencies must come from the default npm registry unless an exception is recorded in [dependency-management.md](./dependency-management.md).

### Software bill of materials

CycloneDX 1.5 SBOMs are generated from lockfiles:

| Artifact | Scope |
| --- | --- |
| [sbom/backend-cyclonedx.json](./sbom/backend-cyclonedx.json) | Backend direct + transitive packages |
| [sbom/frontend-cyclonedx.json](./sbom/frontend-cyclonedx.json) | Frontend direct + transitive packages |

Regenerate after intentional dependency changes:

```bash
./scripts/generate-sbom.sh
```

### Direct dependency catalog (human-readable)

#### Backend runtime

| Package | Declared range |
| --- | --- |
| `@google/genai` | `^2.24.0` |
| `cookie-parser` | `^1.4.7` |
| `cors` | `^2.8.6` |
| `csrf-csrf` | `^4.1.0` |
| `dotenv` | `^17.4.2` |
| `env` | `^0.0.2` |
| `evp_bytestokey` | `1.0.3` |
| `express` | `^5.2.1` |
| `fflate` | `^0.8.2` |
| `google-auth-library` | `^11.0.2` |
| `ipaddr.js` | `^2.5.0` |
| `jsonwebtoken` | `^9.0.3` |
| `module-alias` | `^2.3.4` |
| `mongoose` | `^9.9.2` |
| `node-cron` | `^4.6.0` |
| `pdf-parse` | `^2.4.5` |
| `saxes` | `^6.0.0` |
| `undici` | `^7.30.2` |

#### Backend development

| Package | Declared range |
| --- | --- |
| `nodemon` | `^3.1.14` |

#### Frontend runtime

| Package | Declared range |
| --- | --- |
| `@hugeicons/core-free-icons` | `^4.2.3` |
| `@hugeicons/react` | `^1.1.9` |
| `@tailwindcss/postcss` | `^4.3.3` |
| `@tanstack/react-query` | `^5.102.8` |
| `class-variance-authority` | `^0.7.1` |
| `clsx` | `^2.1.1` |
| `lucide-react` | `^1.75.0` |
| `next` | `^16.0.0` |
| `postcss` | `^8.5.25` |
| `radix-ui` | `^1.6.7` |
| `react` | `^19.2.0` |
| `react-dom` | `^19.2.0` |
| `shadcn` | `^4.16.1` |
| `tailwind-merge` | `^3.6.0` |
| `tailwindcss` | `^4.3.3` |
| `tw-animate-css` | `^1.4.0` |

#### Frontend development

| Package | Declared range |
| --- | --- |
| `@eslint/eslintrc` | `^3.3.1` |
| `@types/node` | `^22.10.2` |
| `@types/react` | `^19.0.2` |
| `@types/react-dom` | `^19.0.2` |
| `eslint` | `^9.17.0` |
| `eslint-config-next` | `^16.0.0` |
| `typescript` | `^5.7.2` |

Lockfiles (`backend/package-lock.json`, `frontend/package-lock.json`) remain the authoritative installed versions. Transitive packages appear in the CycloneDX SBOMs.

### Noted compatibility component

`evp_bytestokey@1.0.3` is retained for e-GP URL format compatibility. Its risk and exception handling are recorded in [dependency-management.md](./dependency-management.md) and [Cryptographic.md](./Cryptographic.md).

## V15.1.3 — Time-consuming / resource-demanding functionality (L2)

**Status:** Documented.

The following operations can consume significant CPU, memory, network, or wall-clock time. Defenses aim to keep responses within consumer timeouts and to protect availability for other users.

| Functionality | Why it is heavy | Documented defenses |
| --- | --- | --- |
| Google auth / CSRF / admin mutations | Burst traffic can overwhelm auth and write paths | Per-client rate limits; HTTP 429 + Retry-After (`app.js`) |
| Certificate multipart upload | Large buffers / image parsing | Aggregate and per-file size limits; reject before full parse (`certificateUpload.js`) |
| Feed / XML / text ingest | Large payloads and deep XML | Byte and nesting caps; reject DTD/entities (`boundedText.js`) |
| e-GP OCR batch | PDF download + Vertex extract | Sequential processing; `OCR_MAX_PER_SYNC` cap (`ocrEgp.js`) |
| PDF text extraction | Local CPU parse | Parser cleanup in `finally` (`readPdfText.js`) |
| Vertex AI calls | Provider latency / quota | AbortSignal timeouts (`vertexClient.js`) |
| Scheduled sync | Long multi-source ingest | Midnight schedule with `noOverlap: true` (`syncScheduler.js`) |
| TOR↔vendor matching | Many Vertex scores | Async job queue, leases, retry/backoff — not inline on ordinary vendor HTTP (`matchTors.js`) |

Full strategy table, test commands, and known scope limits: [design.md — Resource availability controls](./design.md#resource-availability-controls).

Implementation of those defenses is tracked under ASVS **V15.2.2** (TS-55). This section satisfies **V15.1.3** by identifying the heavy paths and documenting prevention strategies (async queues, batch caps, rate limits, timeouts).

## Verification checklist (TS-54)

- [x] V15.1.1 — remediation/update timeframes documented
- [x] V15.1.2 — SBOM generated; trusted registry documented; direct catalog listed
- [x] V15.1.3 — resource-demanding functionality and defenses documented
- [ ] Maintainer review of this document before marking the issue Done
- [ ] Regenerate SBOMs after the next intentional dependency change

## Out of scope for this card

V15.1.4 (risky components highlight) and V15.1.5 (dangerous functionality highlight) are ASVS **L3** and are not required by TS-54. Related notes may appear in cryptographic and dependency documents when relevant.
