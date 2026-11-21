# TORRENT — Software Design Document (Internal)

**Product:** TORRENT — Software TOR Monitor  
**Audience:** Developers joining or maintaining the codebase  
**Related docs:** `x-docs/srs.md` (requirements), `x-docs/codebase-guide.md` (code map), `README.md` (runbook)  
**Status:** Living design doc aligned to the current modular monolith  
**Date:** November 2026  

---

## 1. Purpose of this document

This document explains **how TORRENT is designed inside**: actors and flows, domain concepts, runtime architecture, how frontend and backend talk, data shape, and the TOR PDF extraction sequence.

It is **not** a replacement for the SRS. Requirements live in the SRS. This document answers: *where does that requirement land in code, data, and runtime?*

**Intentionally omitted**

| Item | Why |
| --- | --- |
| UML class diagram | Backend is layered JS modules + Mongoose schemas, not a deep OOP class hierarchy. The **layer diagram** replaces it. |
| Full microservice topology | We run a **modular monolith** (Next.js + Express + MongoDB + in-process jobs), not separate deployable microservices. |

---

## 2. System at a glance

TORRENT is a reversed job board / public monitor for Thai government **software** procurement TORs.

1. **Ingest** official machine feeds on a schedule (and admin-triggered sync).  
2. **Normalize + dedupe** into one `TOR` document (`refId` = stable external id).  
3. **Extract** requirements from TOR PDFs (Vertex / text layer).  
4. **Classify / review** software relevance; hide junk until approved when needed.  
5. **Match** vendor profiles with Vertex; store scores in `tor_matches`.  
6. **Present** public monitor, vendor workspace, admin ops UI over a REST API.

```text
Official sources ──► Sync jobs ──► MongoDB tors
                                      │
Browser (Next.js) ──► Express /api/* ─┤── charts, listings, matches
                                      │
                               Vertex / LINE / Google (side paths)
```

**Runtime services (Docker Compose / local):**

| Service | Tech | Port | Role |
| --- | --- | --- | --- |
| Frontend | Next.js 16 + React 19 + TS | 3000 | UI + thin BFF helpers (e.g. source health) |
| Backend | Express 5 + Mongoose | 5175 | REST API, sync, OCR, matching, auth |
| Database | MongoDB 8 | 27017 | Persistence |

This is **not** microservices. Jobs (sync, match, LINE digest) run **inside the backend process** via schedulers, not as separate networked services.

---

## 3. Use case model

### 3.1 Actors

| Actor | Type | Goal |
| --- | --- | --- |
| Public visitor | Person | Browse software TORs, budget context, monitor — no login |
| Vendor | Person | Profile, matches, saved TORs, alerts (LINE), fit reasons |
| Admin / operator | Person | Sync health, classification review, user/TOR moderation |
| Ingestion worker | System | Scheduled / manual sync of official APIs |
| Matcher worker | System | Queue TOR↔vendor scoring via Vertex |
| Google Identity | System | Vendor/admin sign-in (ID token) |
| Vertex Gemini | System | PDF extraction, classification assist, matching |
| LINE Messaging API | System | Account link + weekly match digest |
| Official procurement APIs | System | data.go / process5, BMA e-GP2, e-GP RSS, etc. |

### 3.2 Use case diagram

```
<diagram:use-case-model>
  Actors: Public, Vendor, Admin, Worker
  Bubbles: UC-1 … UC-14 (see table below)
  Draw associations Primary actor → use case
</diagram:use-case-model>
```

### 3.3 Use case catalogue

| ID | Use case | Primary | Summary |
| --- | --- | --- | --- |
| UC-1 | Browse / search / open TOR | Public, Vendor | List + filter + detail; deep-link to official page |
| UC-2 | Receive match notification | Vendor | Match stored; LINE/email path when enabled |
| UC-3 | View budget dashboard | Anyone | Category medians, compare, historical table |
| UC-4 | Showcase approaches | Public / Vendor | Read (and later submit) differentiated approaches |
| UC-5 | Manage profile & prefs | Vendor | Capabilities, certificates, alert/digest prefs |
| UC-6 | Review classification | Admin | Approve/reject/hide; audit trail |
| UC-7 | Register / log in | Vendor, Admin | Google ID token → HTTP-only session cookie |
| UC-8 | View vendor TOR fit | Vendor | Score, reasons, gaps vs profile |
| UC-9 | Watchlist / saved | Vendor | Save TOR ids (UI; storage may be local + API) |
| UC-10 | Scheduled ingest | Worker | Fetch → adapt → upsert → OCR → merge → enqueue match |
| UC-11 | Monitor source health | Admin | Probe / sync-run visibility |
| UC-12 | Flag inaccuracy | Public / Agency | Report bad data → admin queue |
| UC-13 | Public home & monitor | Public | Landing + KPIs + latest listings |
| UC-14 | Moderate vendor account | Admin | Disable user / review certificates |

### 3.4 Example: UC-10 Scheduled ingest (happy path)

1. Cron fires at **00:00 Asia/Bangkok** (optional also on startup if `FETCH_ON_STARTUP=true`).  
2. Active source `dataGoProcess5` fetches discovery rows, verifies via process5, adapts to normalized TOR shape.  
3. Repository upserts by `refId` (create / change / unchanged).  
4. OCR enrich downloads TOR PDF/ZIP from e-GP, extracts summary + requirements.  
5. Cross-source merge reconciles duplicates.  
6. Eligible TOR ids enqueue on `tor_match_jobs_by_tor`.  
7. New rows may be scored for review thresholds.  
8. Sync summary returned / recorded for ops.

---

## 4. Domain model

Domain language used in code and docs. Prefer these names in PRs and tickets.

### 4.1 Core concepts

| Concept | Meaning |
| --- | --- |
| TOR | Normalized procurement opportunity (draft / published / awarded / discovered / …). System of display, not of bid submission. |
| refId | Stable external identity (e.g. e-GP project_id). Upsert key. Never invent if the source provides one. |
| Source / sourceKind | Where the row came from (EGP-PROCESS5, BMA e-GP2, RSS, …). One TOR may list multiple sources[] after merge. |
| Lifecycle / status | Honest stage from the feed (discovered when no PDF yet, published, awarded, …). Do not invent “draft” for award-only rows. |
| OCR / extract | Structured summary, requirement items, skills, deadline pulled from the TOR PDF. |
| Classification / review | Software-relevance decision + confidence; low confidence → admin review (reviewStatus). |
| Integrity | Soft flags (odd budget, etc.) — a question, not a legal verdict. |
| Vendor profile | Capability description, skills, past projects, certificate image paths. |
| TOR match | Per (userId, torId) score + reason above threshold. |
| Match job | Durable queue row per TOR; cursor + lease so restarts resume. |
| Sync run | Ops record of an ingestion batch. |
| Audit log | Who changed what (review, hide, settings, certificates). |

### 4.2 Domain model diagram

```
<diagram:domain-model>
  Entities and relationships (conceptual):

  Organization / Agency 1──* TOR
  TOR 1──* SourceAppearance (embedded sources[])
  TOR 0..1── OCRResult (embedded ocr{})
  User 1──0..1 VendorProfile
  User *──* TOR  via TORMatch
  TOR 1──0..1 TorMatchJob
  User ── AuditLog (as actor)
  AdminSettings (singleton-ish config for keywords / thresholds)

  External: OfficialAPI ──feeds──► TOR
  External: Vertex ──scores/extracts──► TOR / TORMatch
  External: LINE ──notifies──► User
</diagram:domain-model>
```

### 4.3 Bounded contexts (logical, same deployable)

| Context | Owns | Talks to |
| --- | --- | --- |
| Ingestion | Fetchers, adapters, sync job, merge | Mongo tors, OCR |
| Extraction | PDF download, text/OCR, Vertex extract | tor.ocr |
| Review / admin | Classification rules, hide, audit | tors, audit_logs, settings |
| Matching | Queue, Vertex match, thresholds | tor_matches, jobs |
| Identity | Google verify, JWT cookie, roles | users |
| Vendor | Profiles, certificates | vendor_profiles, upload dir |
| Presentation | Next.js pages, lib/api.ts mapping | HTTP /api |
| Messaging | LINE link + weekly digest | LINE API, matches |

---

## 5. System design

### 5.1 Architectural style

**Modular monolith + scheduled workers in-process.**

- Clear layers inside `backend/src` (routes → controllers → services → repositories → models).  
- Frontend is a separate app that consumes JSON over HTTPS/cookies.  
- No service mesh, no per-domain deployables in v1.  
- External systems are **integrations**, not sibling microservices we own.

### 5.2 Context / container view

```
┌──────────────────────────────────────────────────────────────┐
│ TORRENT                                                      │
│  ┌─────────────┐     HTTPS + cookie      ┌────────────────┐  │
│  │ Next.js UI  │ ──────────────────────► │ Express API    │  │
│  │ (public /   │                         │ + sync/match   │  │
│  │  vendor /   │                         │   schedulers   │  │
│  │  admin)     │                         └───────┬────────┘  │
│  └─────────────┘                                 │           │
│                                                  ▼           │
│                                            ┌──────────┐      │
│                                            │ MongoDB  │      │
│                                            └──────────┘      │
└───────────────┬───────────────────────────────┬──────────────┘
                │                               │
                ▼                               ▼
     data.go / process5 / BMA / RSS      Google · Vertex · LINE
```

```
<diagram:system-design-containers>
  Replace ASCII above with a clean C4 container or deployment diagram
  if needed for the course deliverable.
</diagram:system-design-containers>
```

### 5.3 Why not microservices (yet)

| Concern | Current choice |
| --- | --- |
| Team size / course timeline | One API process is enough |
| Shared TOR document | Single MongoDB avoids distributed transactions |
| Jobs need same models | Sync + OCR + match share repositories |
| Ops cost | One backend image in Compose |

Split later only if a worker must scale independently (e.g. heavy OCR farm). Until then, keep **source adapters** as modules, not services.

### 5.4 Major backend pipelines

**A. Sync pipeline** (`jobs/syncAPI.js`)

```text
ACTIVE_SOURCES (default: dataGoProcess5)
  → fetch() → adapter.adapt()
  → optional BMA hydrate
  → torRepository.saveChanged()
  → OCR enrich (e-GP or BMA plans)
  → mergeDuplicateTors
  → enqueue match jobs
  → score new rows for review
```

Manual-only sources (admin): `process3Process5`, `dataGo`, `bmaEgp2`, `egpRss`, plus OCR-only and SME announcement triggers under `/api/sync/*`.

**B. Match pipeline** (`jobs/matchTors.js`)

```text
TorMatchJob (per torId)
  → walk vendor users from cursor
  → load VendorProfile (+ certificate images)
  → Vertex component scores → final %
  → upsert tor_matches if ≥ threshold
  → on quota errors: status=waiting, retryAt
```

**C. Auth path**

```text
Google button → ID token → POST /api/auth/google
  → verify with Google → upsert User → JWT HTTP-only cookie
  → GET /api/auth/me → SessionProvider
```

### 5.5 Frontend structure (route groups)

| Group | URL examples | Audience |
| --- | --- | --- |
| (public) | /, /dashboard, /tors, /monitor | Anyone |
| (auth) | /login, /register | Sign-in |
| (vendor)/app | /app, /app/matches, /app/profile | Signed-in vendor |
| (admin) | /admin/... | Admin |

Mapping boundary: Mongo fields (`_id`, `status`, `source`) → UI Tor (`id`, `lifecycle`, `sourceKind`) in `frontend/src/lib/api.ts` (`mapBackendTorToFrontendTor`).

---

## 6. Layer diagram (replaces class diagram)

Owner: Sandee. Existing asset: `x-docs/torrent-layer-diagram.svg` / `.png`.

```
<diagram:layer-diagram>
  Paste or link: x-docs/torrent-layer-diagram.svg

  Layers (top → bottom):
  L1 Clients     — public browser, vendor workspace, admin, LINE OA
  L2 Presentation — Next.js App Router, components, lib/i18n, providers
  L3 HTTP API    — Express routes, middleware, controllers
  L4 Domain      — services: auth, tor, admin, vendor, ai, line
  L5 Jobs        — sync (00:00 BKK), match queue, LINE Monday digest
  L6 Data access — repositories + Mongoose models
  L7 Persistence — MongoDB collections

  External column: e-GP RSS, BMA eGP2, data.go/process5, Google, Vertex, LINE
</diagram:layer-diagram>
```

**Dependency rule:** Controllers never touch models/repositories directly. Services own workflows. Source-specific JSON parsing stays in `services/tor/api/<source>/{fetch,adapter}.js`.

---

## 7. API design (frontend ↔ backend)

### 7.1 Transport conventions

| Topic | Rule |
| --- | --- |
| Base URL | Browser: NEXT_PUBLIC_API_URL (default http://localhost:5175/api). SSR may use BACKEND_API_URL. |
| Format | JSON unless multipart (vendor certificates). |
| Auth | HTTP-only cookie (JWT). credentials: include. CORS origins from CORS_ORIGIN. |
| Client helper | frontend/src/lib/api.ts → api() / apiUrl() — avoids /api/api duplication. |
| Errors | JSON { message } (sometimes code); client throws with status. |
| Caching | Dashboard / listings often cache: no-store so sync results show immediately. |

Roles: `public` | `vendor` | `admin`. Middleware: `requireAuth`, `requireRole(...)`, ownership checks on vendor profiles.

### 7.2 Endpoint map

#### Auth — /api/auth

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | /google | — | Exchange Google credential → session cookie |
| GET | /me | yes | Current user |
| POST | /logout | — | Clear cookie |

#### TORs — /api/tors

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | / | public | List / filter TORs |
| GET | /:id | public | Detail |
| GET | /budget-peers | public | Peers for budget compare |
| GET | /top-departments-by-budget | public | Dashboard |
| GET | /category-distribution | public | Dashboard |
| PATCH / DELETE | /:id | admin | Edit / delete existing TOR rows |

TOR creation is handled by source ingestion, with no manual creation API.

#### Matches — /api/tor-matches

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | /mine | vendor/admin | Signed-in user's matches |
| PATCH | /mine/:id | vendor/admin | Own dismiss / feedback |
| POST | /ensure | vendor/admin | Queue shared TOR score computation |
| GET | /, /:id | admin | All-user match list / match by ID |
| PATCH / DELETE | /:id | admin | Maintain existing match records |
| GET | /pending | vendor/admin | Pending TOR job IDs, without match results |

Match creation is job-only. Vendors use `/mine` for reads and `/mine/:id` for
dismissal/feedback; they cannot submit or edit AI scores.

#### Vendor profiles — /api/vendor-profiles

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | / | yes + multipart | Create profile + optional certificate PNGs |
| PATCH | /:id | owner/admin + multipart | Update; retain/remove image paths |
| GET | /get/:userId | self/admin | Profile by user |
| GET | /certificates/:filename | yes | Serve owned/admin certificate file |
| GET / DELETE | … | as routes | List / delete |

Certificate rules (summary): PNG only, ≤5 per category, ≤5 MiB, validated PNG structure; paths stored as upload/...; files under backend/upload/.

#### Sync — /api/sync (admin only)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | / or /all | Run configured sync |
| POST | /data-go-process5 | Primary e-GP discovery + process5 path |
| POST | /process3-process5 | Alternate RSS/process3 path |
| POST | /bma-egp2, /egp-rss, /data-go | Manual sources |
| POST | /sme-announcements | SME announcement pass |
| POST | /ocr, /ocr/bma | OCR-only enrich |

#### Admin — /api/admin (admin only)

Overview, sources, review queue + rescore, TOR search/bulk/PDF stream, audit, users, certificates review, match jobs/retry, classification settings preview/apply, optional LINE digest run.

#### LINE — /api/line

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | /webhook | HMAC signature | LINE events (ACK fast) |
| GET | /status | vendor/admin | Link status |
| POST | /link/start, /unlink | vendor/admin | Account linking |
| PATCH | /digest | vendor/admin | Weekly digest toggle |

#### Users — /api/users

Read, update, and delete helpers for accounts. Account creation requires verified
Google registration; admins cannot create accounts directly.

#### Health

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /, /api/hello | Backend liveness |
| GET | Next /api/sources/health | Frontend server route probing sources |

### 7.3 Typical frontend ↔ API sequences

**Load vendor matches**

```text
Matches page → GET /api/tor-matches/mine (cookie)
            → for each torId: GET /api/tors/:id
            → render cards with matchPercent + matchReason
```

**Google login**

```text
GoogleButton → credential → POST /api/auth/google
            → Set-Cookie → redirect by role → GET /api/auth/me
```

**Save vendor profile with certificates**

```text
Profile form → multipart POST/PATCH /api/vendor-profiles
             → profile JSON field + securityCertificates|aiCertificates|otherCertificates files
             → response with stored relative paths
```

### 7.4 API sketch diagram

```
<diagram:api-overview>
  Swimlanes: Browser | Next.js | Express | MongoDB | External
  Show cookie session on vendor calls
  Show sync as admin → Express → sources → Mongo
</diagram:api-overview>
```

---

## 8. Data design / ER diagram

Owner: Sandee. Live DBML: https://dbdiagram.io/d/6a940246aed2f4f6be658c21  

MongoDB is document-oriented; the ER view treats **collections as tables** and Mongoose refs as logical FKs (not enforced by the DB).

```
<diagram:er-diagram>
  Embed export from dbdiagram.io (or screenshot).
  Collections at minimum:
    users
    vendor_profiles
    tors
    tor_matches
    tor_match_jobs_by_tor
    audit_logs
    sync_runs
    admin_settings
</diagram:er-diagram>
```

### 8.1 Collection summary

| Collection | Model file | Purpose |
| --- | --- | --- |
| users | User.js | Identity, role, Google/LINE link fields |
| vendor_profiles | VendorProfile.js | 1:1 with user; skills, projects, cert paths |
| tors | TOR.js | Normalized opportunities + ocr + merge metadata |
| tor_matches | TORMatch.js | Unique (userId, torId) score |
| tor_match_jobs_by_tor | TorMatchJob.js | Durable match queue |
| audit_logs | AuditLog.js | Admin/review actions |
| sync_runs | SyncRun.js | Ingestion run records |
| admin_settings | AdminSettings.js | Keyword rules + thresholds |

### 8.2 Logical relationships

```text
User 1 ──────── 0..1 VendorProfile   (userId unique)
User 1 ──────── *   TORMatch         (userId)
TOR  1 ──────── *   TORMatch         (torId)
TOR  1 ──────── 0..1 TorMatchJob     (torId unique)
User 0..* ────── *  AuditLog         (actorId, soft)
```

### 8.3 TOR document (important fields)

| Field | Notes |
| --- | --- |
| refId | External stable id; upsert key with source handling |
| title / titleTh | Display titles |
| status | Lifecycle string from adapters |
| source | Primary source label |
| budgetThb, deadline, publishedAt | Numbers/dates for UI + matching |
| agencyId, department* | Agency / unit |
| documentUrl, egpUrl | Official links |
| hidden, reviewStatus, confidence | Visibility / review |
| integrity* | Soft integrity flags + notes |
| sources[] | Multi-source lineage after merge |
| mergeConflicts[], mergeStatus | Cross-feed conflict handling |
| ocr{} | Extraction status, summaries, requirementItems[], skills, deadline |

### 8.4 Matching score policy (domain rule)

Implemented in match/Vertex services (see README):

- **30** points: budget vs team size / past project budgets  
- **70** points: requirements fit (Tier 1 coverage & past projects, Tier 2 skills, Tier 3 other)  
- Certificate bonuses capped (Security 2 + AI 2 + Other 3 ≤ 7) inside overall bonus ceiling; final ≤ **100**  
- Persist only if ≥ VERTEX_MATCH_MIN_PERCENT

---

## 9. Sequence diagram — TOR extraction process

Owner: Uchula (per Tai: **only this sequence is required**).

### 9.1 Scope

End-to-end path used by the primary ingest: **data.go discovery → process5 verification → PDF/ZIP download → Vertex/text extract → save ocr → enqueue matching**.

### 9.2 Participants

Scheduler · syncAPI · dataGoProcess5.fetch · adapter · torRepository · ocrEgp · extractPlanPdf · Vertex · matchTors

### 9.3 Sequence (textual)

```text
Scheduler                syncAPI              Sources                 Mongo              OCR/Vertex           Matcher
   |                        |                    |                      |                    |                    |
   |-- daily / manual ----->|                    |                      |                    |                    |
   |                        |-- fetch rows ----->|                      |                    |                    |
   |                        |<-- dataGo+p5 ------|                      |                    |                    |
   |                        |-- adapt()          |                      |                    |                    |
   |                        |-- saveChanged --------------------------->|                    |                    |
   |                        |-- enrich(candidates)----------------------------------------->|                    |
   |                        |                    |                      |  download PDF/ZIP  |                    |
   |                        |                    |                      |  text layer?       |                    |
   |                        |                    |                      |    yes → structure w/ Vertex JSON       |
   |                        |                    |                      |    no  → scan PDF parts → Vertex OCR    |
   |                        |                    |                      |  normalize requirementItems            |
   |                        |-- saveOcr -------------------------------->|                    |                    |
   |                        |-- mergeByRefIds -------------------------->|                    |                    |
   |                        |-- enqueueTors(ids) --------------------------------------------------------------->|
   |                        |<-- sync summary ---|                      |                    |                    |
```

### 9.4 Diagram placeholder

```
<diagram:sequence-tor-extraction>
  UML sequence for the flow in §9.3.
  Highlight:
    1) Only https://*.gprocurement.go.th document URLs accepted
    2) ZIP prefer tor_*.pdf over Attach_TOR scans
    3) OCR_ENABLED=false skips extract
    4) OCR_MAX_PER_SYNC caps work per run
    5) SUMMARY_VERSION bump forces re-extract
    6) Matching runs async after enqueue (not inside HTTP request path for vendors)
</diagram:sequence-tor-extraction>
```

### 9.5 Extraction internals (extractPlanPdf)

1. If PDF has a usable text layer → send text + schema prompt to Vertex (generateStructured).  
2. Else → send PDF bytes as inline part (generateFromParts) — true OCR path.  
3. Model must return JSON: summaryTh, summaryEn, requirementItems[] (technical|delivery|compliance|team|other), deadline, skills.  
4. Normalize → flat requirements / requirementsEn for legacy consumers.  
5. Persist under tor.ocr with status, method, fileUrl, summaryVersion, timestamps / error.

Projects without a downloadable TOR stay `discovered` and are **not** treated as match-ready rich records.

---

## 10. Cross-cutting concerns

| Concern | Design |
| --- | --- |
| Secrets | Env only (MONGO_URI, DATA_GO_API_KEY, Vertex, LINE, Google client). Never in the Next bundle. |
| AuthZ | Role middleware + ownership on profiles/certificates. |
| Idempotent sync | Upsert by refId; re-sync updates rather than clones. |
| Failure isolation | Source fetch failure → retry/backoff; match quota → durable waiting job. |
| Observability | Backend logs; admin sync/overview; audit log for human decisions. |
| i18n | TH/EN dictionary on frontend; TOR bilingual fields where extracted. |
| Apply off-platform | UI always deep-links to official e-GP / listing URL. |

---

## 11. How a new developer should read the code

1. `docker-compose.yml` — three services.  
2. `backend/src/server.js` + `app.js` — boot + router mount.  
3. `backend/src/jobs/syncAPI.js` — ingestion heart.  
4. `backend/src/services/tor/ocr/ocrEgp.js` + `extractPlanPdf.js` — extraction.  
5. `backend/src/jobs/matchTors.js` — matching heart.  
6. `frontend/src/lib/api.ts` — API + TOR mapping.  
7. `frontend/src/app/(public)/dashboard` and `(vendor)/app/*` — main UX.  

Full file-level map: `x-docs/codebase-guide.md`.

---

## 12. Open / evolving design points

- Which sources stay **ACTIVE** vs **manual** (today primary active = dataGoProcess5).  
- Showcase / watchlist persistence may still mix localStorage vs API depending on screen.  
- Atlas Search / vector search called out in SRS as future matching aid — not required for current Vertex path.  
- Class diagram omitted; keep layer diagram updated when folders move.

---

## 13. Asset checklist for the course pack

| Asset | Owner | Status in this doc |
| --- | --- | --- |
| Use case diagram | Team | &lt;diagram:use-case-model&gt; |
| Domain model diagram | Team | &lt;diagram:domain-model&gt; |
| System / container diagram | Team | &lt;diagram:system-design-containers&gt; |
| Layer diagram | Sandee | File exists; &lt;diagram:layer-diagram&gt; |
| ER / DBML | Sandee | Link + &lt;diagram:er-diagram&gt; |
| TOR extraction sequence | Uchula | Text flow + &lt;diagram:sequence-tor-extraction&gt; |
| UML class diagram | — | **Skipped** (not OOP-centric) |

---

## Appendix A — Glossary

| Term | Meaning |
| --- | --- |
| TOR | Terms of Reference / procurement package for a project |
| e-GP | Thai electronic government procurement |
| process5 | e-GP web/API surface used to verify project + document links |
| data.go | Open data portal used for discovery (cgdcontract / related) |
| OCDS | Open Contracting Data Standard (BMA packages in SRS) |
| Vertex | Google Cloud Vertex AI Gemini used for extract/match |
| Modular monolith | One deployable API with internal modules, not microservices |

## Appendix B — References

- SRS: `x-docs/srs.md`  
- Codebase guide: `x-docs/codebase-guide.md`  
- Proposal: `x-docs/project_details/Proposal.md`  
- Layer SVG: `x-docs/torrent-layer-diagram.svg`  
- DB diagram: https://dbdiagram.io/d/6a940246aed2f4f6be658c21  
