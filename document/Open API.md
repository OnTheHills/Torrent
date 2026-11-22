# TORRENT REST API reference

Updated: 21 November 2026.

Scope: all currently mounted Express routes and the two Next.js API handlers.
This reference records current behavior, including remaining authorization gaps;
it does not mark ASVS V8.1 complete.

This is a human-readable reference for the currently implemented REST API. It is
Markdown documentation, not an importable OpenAPI YAML/JSON specification. Access
labels describe the checks currently enforced by the server.

Examples use placeholders, synthetic identifiers and reserved `example.test`
addresses. Credentials, session values, real user records, deployment-specific
addresses and development-only administrative endpoints are excluded.

## 1. Base URLs and conventions

| Environment | Base URL |
| --- | --- |
| Local Express backend | `http://localhost:5175/api` |
| Local Next.js frontend endpoints | `http://localhost:3000/api` |

The backend listener uses `PORT`. The frontend selects its backend through
`BACKEND_API_URL` for server requests and `NEXT_PUBLIC_API_URL` for browser requests.
The URLs above describe the existing development setup.

- Send JSON bodies with `Content-Type: application/json`, except file uploads.
- `{id}` and `{userId}` normally identify MongoDB documents using 24-character
  hexadecimal ObjectId strings. A profile ID, user ID, TOR ID, and match ID are
  different identifiers.
- Dates are returned as JSON date strings. Admin date-only inputs such as
  `2026-11-09` are interpreted as midnight in Bangkok (`+07:00`).
- Successful reads/updates/deletes normally return `200`; CRUD creation returns
  `201`. Deletes return the deleted document rather than an empty `204` response.
- Most collection responses are plain arrays without pagination. Admin endpoints
  use the response objects described below.
- `PUT /email-alerts/preferences` replaces the current user’s email preferences.
- GET routes also handle HEAD with the same access checks and no response body.
- Express route matching is case-insensitive and accepts trailing slashes by
  default. Query strings do not bypass authorization.
- JSON request bodies default to a 256 KiB limit, configurable with `JSON_BODY_LIMIT`.
- Public TOR responses generally use `_id`; admin TOR presentation uses `id`.
  Omitted fields, optional fields and `__v` may vary by stored document.

## 2. Authentication and access

### Session cookie

Successful Google authentication sets `torrent_session` locally, or
`__Host-torrent_session` in production / when `COOKIE_SECURE=true`. It contains a
signed JWT with `sub` (local user ID), `role`, `email`, `sv` (session version),
`jti` (token identifier), `iat`, and `exp` claims.
The response body contains user data; the local JWT is not returned as a body field.

| Setting | Current behavior |
| --- | --- |
| `HttpOnly` | Enabled |
| `SameSite` | `lax` |
| `Secure` | Enabled in production or when `COOKIE_SECURE=true`; Host cookie has no Domain |
| Cookie path | `/` |
| Cookie maximum age | `JWT_EXPIRES_IN` when formatted as integer + `s`, `m`, `h`, or `d`; otherwise seven-day fallback |
| JWT lifetime | `JWT_EXPIRES_IN`, default `7d` |

Browser requests that need the session must use `credentials: "include"`.
The API expects the session cookie; an `Authorization: Bearer ...` header alone
does not authenticate these routes. `CORS_ORIGIN` is a comma-separated allowlist
of frontend origins, with credentialed CORS responses enabled.

Protected requests re-read the account from MongoDB. The database role takes
precedence over stale JWT role claims. Missing/deleted/disabled users, revoked
JWT IDs, and mismatched session versions are rejected. Authenticated sessions may
rotate after half their lifetime; role/email changes also refresh claims. Clients
must retain Set-Cookie responses and renew CSRF tokens after session changes.
The dedicated `/admin/users/{id}` privilege update increments the session version
when role/disabled state changes. The generic user PATCH does not perform that
same version increment or audit workflow.

### Global authentication gate

`requireMutationAuth` runs after cookie parsing and before JSON/upload processing.
Every backend POST, PUT, PATCH, and DELETE requires a valid, unexpired session,
with these two POST exceptions:

| Exception | Authentication performed instead |
| --- | --- |
| `/api/auth/google` | Google ID-token verification before creating a session; browser Origin/CSRF checks still apply |
| `/api/line/webhook` | HMAC-SHA256 verification of the original request bytes |

Logout requires a session. Missing sessions
return `401 {"message":"Not signed in."}`. Expired or invalid tokens return
`401 {"message":"Session expired or invalid."}`. A valid session does not bypass
additional route-specific role or ownership checks.

The gate also protects GET/HEAD requests. Public read exceptions are the visible
TOR list, its three aggregate endpoints, valid ObjectId TOR detail paths, enabled
`/api/hello`, and `/api/auth/csrf` (registered before the gate). Unknown `/api`
paths also encounter this gate before route lookup. A missing session can therefore
produce `401` even for an unregistered endpoint.

A signed-in `public` account may call `/auth/me` and `/auth/logout`, plus public
endpoints, but cannot access vendor/admin resources. Vendor access to a mounted
API family still requires its route-specific role/ownership checks. CORS preflight
is handled before route authentication.

### Access labels used below

| Label | Meaning |
| --- | --- |
| Public | No local session required |
| Session | Any valid local session; no extra role/owner restriction on that route |
| Self/admin | Vendor session subject matches the requested user ID, or role is `admin` |
| Owner/admin | Vendor session owns the requested record/certificate, or role is `admin` |
| Vendor/admin | Role is `vendor` or `admin` |
| Admin | Role is `admin` |
| LINE signature | Valid `x-line-signature`; browser session is not required |

### CSRF protection

Browser POST, PUT, PATCH, and DELETE requests must include an `Origin` exactly
matching an entry in `CORS_ORIGIN` and a valid `x-csrf-token` header. This includes
Google login, logout and multipart uploads. Missing/untrusted/null origins receive
`403` with code `INVALID_ORIGIN`; invalid or missing token/cookie pairs receive
`403` with code `INVALID_CSRF_TOKEN`. These checks run before body parsing/handlers.
LINE webhooks bypass browser Origin/CSRF checks and retain signature verification.

Fetch public `GET /api/auth/csrf` with `credentials: "include"` and `cache: "no-store"`.
The response is `200 {"csrfToken":"<token>"}` and sets HttpOnly CSRF cookies. It has
`Cache-Control: no-store` and varies by Origin/Cookie. A supplied untrusted Origin
is rejected even on this token endpoint. Ordinary public GET/HEAD/OPTIONS requests
do not require CSRF tokens.

The signed double-submit token is bound to the session JWT, or a random browser
identifier before login. The frontend sends the returned token in the header;
it does not read the HttpOnly cookies. Store the token in memory, not in URLs,
logs or persistent browser storage. Obtain a new token after login/logout or a
session change. The shared `api()` client does this automatically, shares token
requests between concurrent writes, and retries one stale-token rejection. It
does not retry role/ownership or Origin rejections.

Local HTTP uses `torrent_csrf` and `torrent_csrf_session` cookies. HTTPS configured
with `COOKIE_SECURE=true`, or production mode, uses `__Host-` prefixed Secure cookies
with Path=/ and no Domain. CSRF cookies are SameSite=Lax and browser-session cookies.
The private HMAC key comes from `CSRF_SECRET`, falling back to configured
`COOKIE_SECRET`, then `JWT_SECRET`; there is no hardcoded secret fallback.

The implementation follows the [csrf-csrf signed double-submit pattern](https://github.com/Psifi-Solutions/csrf-csrf).

Logout revokes the current JWT ID until expiry and clears both supported session
cookie names in that browser. Revocation uses an in-memory mirror and MongoDB
when available; persistence failures leave the current process’s mirror in place. The access labels describe
authentication requirements; they are not a claim of complete security compliance.

### Role and ownership summary

| Resource / function | Guest or signed-in public | Vendor | Admin |
| --- | --- | --- | --- |
| Visible TOR catalog and budget aggregates | Read | Read | Read |
| Account registration | Verified Google registration as public/vendor | Same registration flow; existing accounts cannot register again | No direct account creation |
| Own session (`/auth/me`, logout) | Signed-in public only | Yes | Yes |
| Generic user records | No | Own read/update/delete | All read/update/delete |
| Vendor profiles / certificate bytes | No | Own | All existing; creation still binds to own session |
| Match result reads | No | `/mine` only | `/mine`, all-user list, by-ID |
| Match writes | No | Own dismissal/report/restore through `/mine/{id}` only | Generic PATCH/DELETE and own mine feedback; no manual creation |
| Notifications, LINE settings, email preferences | No | Own | Own through these endpoints |
| Admin review, audit, settings, job inspection | No | No | Yes |
| Source sync / OCR operations | No | No | Trigger configured jobs |
| Manual TOR creation | No | No | No; ingestion creates records |

Ownership means comparing the resource’s stored `userId` with the verified session
subject, not trusting a user ID supplied in query/body. Match creation is performed
by the matching job, with no manual creation endpoint. Backend checks are authoritative; Next.js
also gates `/app` to vendor/admin and `/admin` to admin through `/auth/me`.

Removed APIs: `POST /users`, `POST /tors`, `POST /tor-matches`, and all `/user-bios` routes are no longer
registered. After applicable authentication/CSRF checks they fall through to 404;
anonymous/private API requests can receive 401 first. The separate vendor-profile
`bio` field remains supported. There is no watchlist API: saved TOR IDs currently
use browser localStorage rather than account-scoped server persistence.

### Current field access and state rules

These describe implementation behavior, including broad fields still accepted.
They are not a proposed stricter policy or a completed ASVS assessment.

| Resource | Fields returned to an authorized reader | Write restrictions / resource attributes |
| --- | --- | --- |
| Auth / generic users | Stored user fields except schema-hidden `passwordHash`; no explicit allowlist for remaining identity, LINE, preference or session-version fields | Vendor account PATCH allows only `username`, `firstname`, `lastname`, `picture`; admin generic PATCH is broader |
| Dedicated admin user views | Explicit presentation of identity/status, profile completeness and certificate metadata; detail adds profile summary and LINE status | `/admin/users/{id}` accepts role/disabled plus reason, audits, increments session version when privilege state changes |
| Vendor profile | Stored profile fields, `userId`, certificate metadata/paths and timestamps | Controller allowlist; immutable owner; image retention/upload ownership rules below |
| Public TOR list | Stored list fields except `description`, `requirements`, `sources`, `mergeConflicts`, `reviewNote`, `reviewScoreReason`, integrity notes, and heavy OCR requirement/summary/error fields; adds `matchEligible` | Public cannot write; hidden records excluded |
| Public TOR detail | Visible stored TOR including OCR/requirements/source/review fields and `matchEligible`; no separate audience-specific detail projection | Hidden/missing records return 404; enrichment may persist translations/grouping |
| Generic admin TOR PATCH | Updated TOR and `matchEligible` | Admin required; passes update to repository without the dedicated edit allowlist/reason/audit workflow |
| Dedicated admin TOR views | Presented administrative fields, detail/source/PDF metadata | Edit and review field allowlists below; review decisions change approved/rejected/hidden state |
| AI match | Stored owner/TOR IDs, score, reason, dismissal/feedback times and timestamps | Job creates results; admin generic reads/PATCH/DELETE; vendors read own mine and update dismissal/feedback only |
| Notification | Own stored notification fields | Only boolean `read`/`dismissed`; owner is session-bound; dismissed items omitted from list |
| Email preferences | Own preference fields and server dates plus `deliveryConfigured` | Validated complete preference body; server controls dates; cannot choose recipient/user ID |
| LINE status | Own linking/digest status, pending code/expiry and OA URL | Only own link/unlink and boolean digest toggle; enabling requires linked account; webhook requires signature |

### Rate limits

Limits are per client IP in each running backend process, with in-memory buckets.
`TRUST_PROXY` controls Express proxy trust (default 1). These are not shared counters
across multiple backend instances.

| Endpoint / action | Default | Environment override |
| --- | --- | --- |
| `GET /auth/csrf` | 60 requests per minute | `RATE_LIMIT_CSRF_MAX` |
| `POST /auth/google` | 20 requests per 15 minutes | `RATE_LIMIT_GOOGLE_AUTH_MAX` |
| Non-read `/admin` actions | 120 requests per minute | `RATE_LIMIT_ADMIN_WRITE_MAX` |

Rate-limited responses are `429 {message:"Too many requests. Try again shortly.",
code:"RATE_LIMITED"}` with `Retry-After` and `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, `X-RateLimit-Reset` headers. Admin limits do not cover
writes under `/tors`, `/users`, or `/sync` just because an admin performs them.

## 3. Health endpoints

These paths are on the Express host and are not both under the `/api` base.

| Method | Full path | Access | Success response |
| --- | --- | --- | --- |
| GET | `/` | Public | `200 {"message":"Backend is running"}` |
| GET | `/api/hello` | Public | `200 {"message":"Hello from Express!"}` |

These routes exist only when diagnostics are enabled: `ENABLE_DIAGNOSTICS=true`
enables them, `false` disables them, and the default is enabled outside production.
They confirm the HTTP application is reachable; they are not a full
database or external-provider health report.

## 4. Authentication endpoints

All paths below are relative to the Express `/api` base.

| Method | Path | Access | Request | Success |
| --- | --- | --- | --- | --- |
| GET | `/auth/csrf` | Public; supplied Origin must be trusted | No body | `200 {csrfToken}` and HttpOnly CSRF cookies |
| POST | `/auth/google` | Public | `{credential, role?}` | `200` user document and session cookie |
| GET | `/auth/me` | Session | No body | `200` current user, excluding `passwordHash` |
| POST | `/auth/logout` | Session | No body | `200 {"ok":true}` and cleared cookie |

For **registration**, supply `role: "public"` or `role: "vendor"` with a Google
credential. For **login**, omit `role`; an existing account must already exist.
Registration cannot request `admin`. Passing a registration role for an existing
account returns `409` rather than signing into that account.

```json
{
  "credential": "<Google ID token returned by Google Sign-In>",
  "role": "vendor"
}
```

Google authentication responses intentionally hide internal account-lookup codes:

| Status | Response | Meaning |
| --- | --- | --- |
| 400 | `{message:"Missing Google credential."}` | Missing/non-string credential |
| 401 | `{message:"Sign-in failed."}` | Invalid Google credential, unknown account on login, conflicting Google identity, or disabled account |
| 409 | `{message:"This email is already registered. Log in instead.",code:"email_registered"}` | Registration requested for an existing account |
| 500 | `{message:"Something went wrong."}` | Unexpected authentication failure |

Other internal authentication codes are logged server-side rather than returned.
A role other than `public` or `vendor` does not enter registration mode; it cannot
create an admin account. Login preserves the stored role.

## 5. Users

| Method | Path | Access | Success |
| --- | --- | --- | --- |
| GET | `/users` | Admin | `200` user array |
| GET | `/users/{id}` | Self/admin | `200` user |
| PATCH | `/users/{id}` | Self/admin | `200` updated user |
| DELETE | `/users/{id}` | Self/admin | `200` deleted user |

All `/users` routes require vendor/admin, including self access; signed-in public
accounts cannot use these endpoints. Vendor PATCH accepts only `username`,
`firstname`, `lastname`, and `picture`; additional top-level fields receive `403`.
Admins bypass that field allowlist on the generic PATCH, which passes the supplied
update to the repository without the dedicated admin reason/audit workflow.
Reads and successful updates/deletes return stored user documents, with the
schema-excluded `passwordHash` omitted. There is no narrow response allowlist for
other account fields on these generic endpoints.
Accounts are created through Google registration at `/auth/google`, which verifies
the Google credential and permits only `public` or `vendor` registration. There is
no direct user-creation endpoint, including for admins.

```json
{"firstname":"Somchai","lastname":"Example","username":"somchai"}
```

For routine profile updates, submit ordinary profile fields as above. Use the
admin user-management endpoints for account-administration workflows. Clients
should read the response fields they need rather than relying on every stored
account field being part of a stable response contract.

## 6. Vendor profiles and certificate images

| Method | Path | Access | Success |
| --- | --- | --- | --- |
| POST | `/vendor-profiles` | Vendor/admin; owner bound to session | `201` created profile |
| GET | `/vendor-profiles` | Admin | `200` profile array |
| GET | `/vendor-profiles/get/{userId}` | Self/admin | `200` profile for that user |
| GET | `/vendor-profiles/{id}` | Owner/admin | `200` profile by profile ID |
| PATCH | `/vendor-profiles/{id}` | Owner/admin | `200` updated profile |
| DELETE | `/vendor-profiles/{id}` | Owner/admin | `200` `{ok:true}`; removes profile certificates and match records |
| GET | `/vendor-profiles/certificates/{filename}` | Owner/admin | `200 image/png` |

All profile routes require vendor/admin. Creation binds `userId` to the signed-in
user, including when the caller is an admin; this POST cannot create a profile for
another user. Updates cannot change the owner. Admins may inspect/update/delete
existing profiles belonging to other users. Profile reads and writes return the
stored profile, including its certificate metadata/path arrays; certificate image
bytes require the separate owner/admin-protected endpoint.

Only the fields below are forwarded by the profile controller. The `certificates`
review metadata array is managed through `/admin/certificates`, not profile writes.
Saving a profile does not explicitly enqueue matching again. The profile’s `bio`
is used when AI matching next processes that profile.

Allowed create/update fields:

| Field | Type / expected content |
| --- | --- |
| `vendorType` | `company` or `individual`; default `company` |
| `vendorName`, `vendorEmail`, `vendorPhone` | Strings |
| `vendorCapDescription`, `bio`, `website`, `location` | Strings |
| `teamSize` | String |
| `techSkills` | Array of strings |
| `pastProjects` | Array of project objects described below |
| `securityCertificates`, `aiCertificates`, `otherCertificates` | Arrays of existing stored image paths to retain |

Example JSON profile:

```json
{
  "vendorType": "company",
  "vendorName": "Example Software",
  "vendorEmail": "vendor@example.test",
  "vendorCapDescription": "Web application development",
  "teamSize": "5",
  "techSkills": ["Node.js", "React"],
  "pastProjects": [{
    "name": "Example portal",
    "description": "Developed an internal web portal",
    "budget": 500000,
    "isGovernment": false,
    "completedAt": "2026-09-01T00:00:00+07:00",
    "urls": ["https://example.test/project"]
  }]
}
```

A project requires `name`. Its `budget` is a non-negative number or null;
`description`, `isGovernment`, `completedAt`, and `urls` are optional.

### Profile input validation rules

The following rules describe the current vendor-profile form. Browser-native
constraints run on normal form submission; explicit JavaScript checks run before
the profile request is sent. Frontend constraints can be bypassed by direct API
requests, so the enforcement column distinguishes them from server validation.
The API accepts some optional project fields that the frontend requires for a
populated row, as described above.

| Data item | Expected structure and validation | Current enforcement |
| --- | --- | --- |
| `vendorType` | `company` or `individual` | Frontend selection and backend schema enum |
| `vendorEmail` | Optional email address; a non-empty value must satisfy the browser's `type="email"` syntax check | Browser form validation; backend stores a trimmed string without an email-format validator |
| `website` | Optional absolute URL; a non-empty value must satisfy the browser's `type="url"` syntax check | Browser form validation; backend stores a trimmed string without a URL-format or scheme allowlist validator |
| `vendorPhone` | Optional telephone string; no country-specific pattern, digit count, or phone-number format is currently enforced | Frontend uses `type="tel"`, which provides an input hint rather than a format check; backend stores a trimmed string |
| `teamSize` | String; numeric entry is suggested, but no numeric range or integer check is currently enforced | Frontend uses `inputMode="numeric"`; backend stores a trimmed string |
| `vendorName`, `location`, `bio` | Optional free-text strings, with no explicit field-length limit | Backend schema trims strings; request-size limits still apply |
| `vendorCapDescription`, `techSkills` | Capability text is comma-separated; submitted skills are an array of non-empty trimmed strings | Frontend trims entries and removes empty entries; custom labels have commas removed and are deduplicated case-insensitively within their respective list |
| `pastProjects` | Array of project objects; completely empty editor rows are omitted | Frontend checks whether any row field or saved URL has content before submission |
| Project `name`, `description` | Non-empty after trimming for every populated editor row | Explicit frontend save check; backend schema requires `name`, while `description` is optional |
| Project `budget` | Required in each populated editor row; must convert to a finite number >= 0 | Explicit frontend save check; backend numeric schema has minimum 0 and permits null |
| Project `isGovernment` | Each populated editor row must select Government or Private; submitted as boolean `true` or `false` | Explicit frontend save check; backend boolean field permits null |
| Project `completedAt` | Optional real calendar date entered as `d/m/yyyy` or `dd/mm/yyyy`; normalized to `dd/mm/yyyy` on blur and submitted as `yyyy-mm-dd`, or null when empty | Explicit frontend parser checks day/month/year and rejects impossible dates, including invalid leap days; backend uses a Date field |
| Project `urls` | Array of strings; added values are trimmed, empty values ignored, and duplicates compared case-insensitively | Frontend normalization; neither the URL editor nor backend string-array schema currently validates URL syntax |
| Certificate image | Case-insensitive `.png` extension; MIME must be `image/png` when supplied; valid PNG signature and decodable image; <= 5 MiB, <= 10,000 pixels per side, and <= 16,000,000 pixels total | Frontend checks file metadata, signature and browser decoding/dimensions; backend additionally validates PNG chunks, checksums and scanlines as described below |

Blank email and website values are allowed; these fields are not marked
`required`. Browser syntax checks do not verify mailbox existence, telephone
ownership, or whether a website is reachable. No application-specific maximum
length or additional format pattern is currently configured for those fields.
This section records existing behavior and does not establish complete ASVS
coverage or server enforcement of every frontend rule.

Implementation references:

- [Profile form and save checks](../frontend/src/app/(vendor)/app/profile/page.tsx)
- [Frontend certificate checks](../frontend/src/components/profile/certificate-uploads.tsx)
- [Backend profile schema](../backend/src/models/vendor/VendorProfile.js)
- [Backend PNG validation](../backend/src/utils/certificatePng.js)

### Multipart upload format

POST and PATCH accept either JSON for profile-only changes or `multipart/form-data`:

- One text field named `profile`, containing the profile JSON object.
- File fields named `securityCertificates`, `aiCertificates`, or
  `otherCertificates`. Repeat a field for multiple files.
- At most five retained/new images per category and 5 MiB per image.
- PNG extension, MIME type, signature, chunk checksums and scanlines are checked.
  Dimensions are capped at 10,000 pixels per side and 16 megapixels.
- The `profile` text is limited to 1 MiB and the overall incoming multipart bytes
  are bounded by the combined profile/file limit.

```javascript
const form = new FormData();
form.append("profile", JSON.stringify({ vendorName: "Example Software" }));
form.append("securityCertificates", selectedPngFile);
const tokenResponse = await fetch("http://localhost:5175/api/auth/csrf", {
  credentials: "include", cache: "no-store"
});
const { csrfToken } = await tokenResponse.json();

await fetch("http://localhost:5175/api/vendor-profiles", {
  method: "POST",
  credentials: "include",
  headers: {"x-csrf-token": csrfToken},
  body: form
});
```

Let the browser set the multipart Content-Type/boundary. On updates, omitting a
certificate path array preserves it; an empty array removes that category's
images. Included paths must already belong to the profile. Uploaded images are
appended and their generated `upload/...png` paths are returned in the profile.
GET the certificate endpoint using only the filename, not the `upload/` prefix.
Responses use `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`.

Profile writes may return `400` validation errors, `403` owner violations, `404`
missing profiles, `409` duplicate profiles, or `413` upload-size errors.

## 7. TOR catalog and dashboard aggregates

| Method | Path | Access | Request / success |
| --- | --- | --- | --- |
| GET | `/tors` | Public | `200` non-hidden TOR array, newest published first |
| GET | `/tors/budget-peers` | Public | Required query `category`; `200` array with `_id`, `budgetThb`, `category` |
| GET | `/tors/top-departments-by-budget` | Public | `200 {departments:[{department,totalBudget,torCount}]}` |
| GET | `/tors/category-distribution` | Public | `200 {categories:[{category,frequency}]}` |
| GET | `/tors/{id}` | Public | `200` TOR detail; hidden/missing TOR returns `404` |
| PATCH | `/tors/{id}` | Admin | Changed TOR fields; `200` updated TOR |
| DELETE | `/tors/{id}` | Admin | `200` deleted TOR |

The public list omits heavy OCR text, requirements, source/merge history and some
review/integrity notes. Detail responses include additional stored/enriched fields.
The catalog does not currently implement server-side pagination or general search
query filters; use the admin search endpoint for its documented filters.

Common TOR fields are `title` (required), `titleTh`, `description`, `summary`,
`summaryTh`, `source`, `refId`, `status`, `category`, `budgetThb`, `budgetYear`,
`department`, `departmentTh`, `publishedAt`, `deadline`, `egpUrl`, `documentUrl`,
`torPdfPath`, `skillNeededList`, and optional `ocr` extraction metadata. Returned
catalog/detail records add `matchEligible` to indicate current matching eligibility.

```json
{
  "title": "Develop a public information website",
  "category": "Web Application",
  "budgetThb": 1200000,
  "budgetYear": "2570",
  "status": "published",
  "department": "Example agency",
  "deadline": "2026-12-01T00:00:00+07:00"
}
```

Budget peers require an exact category and return only visible positive-budget
records. Missing category returns `400`. Department totals return up to ten
departments. Category distribution returns the top seven named categories with
the remaining categories combined into `Others`; no records yields an empty array.
The two dashboard aggregate responses set `Cache-Control: no-store`.

TORs are created through source ingestion; there is no manual creation endpoint,
including for admins. Admins can edit and delete existing TORs.

TOR ingestion/update may queue asynchronous matching; a successful HTTP response does
not mean every vendor score is ready. TOR detail reads may also persist missing
English translations/requirement grouping during enrichment.

## 8. Vendor–TOR matches

| Method | Path | Access | Request / success |
| --- | --- | --- | --- |
| GET | `/tor-matches` | Admin | `200` match array across all users |
| GET | `/tor-matches/pending` | Vendor/admin | `200` array of TOR IDs with unfinished matching jobs |
| GET | `/tor-matches/mine` | Vendor/admin; scoped to current user | `200` signed-in user's eligible match array |
| PATCH | `/tor-matches/mine/{id}` | Vendor/admin; scoped to current user | Dismiss/report body; `200` updated match |
| POST | `/tor-matches/ensure` | Vendor/admin | `{torIds:[...]}`; `200 {queued:number}` |
| GET | `/tor-matches/{id}` | Admin | `200` match |
| PATCH | `/tor-matches/{id}` | Admin | Match changes; `200` updated match |
| DELETE | `/tor-matches/{id}` | Admin | `200` deleted match |

Match records have required `userId` and `torId`, plus `matchPercent`, `matchReason`,
`dismissedAt`, `badResultAt`, and timestamps. `matchPercent` is stored as MongoDB
Decimal128 and may serialize as an Extended JSON decimal object rather than a
JavaScript number. Use the `/mine` operations for user-specific dismiss/report
actions; these operations scope the match lookup to the signed-in user.
Vendors cannot read the all-user list or fetch any match by ID through the generic
GET endpoint, even if they own it. Both reads are admin-only and return `403` for
vendors; vendors read their match results through `/mine`.

```json
{"dismissed":true}
```

Send `{"dismissed":false}` to restore a dismissal or `{"badResult":true}` to mark
the match as a bad result and dismiss it. An empty body defaults to dismissal.
`{id}` identifies a match, not its TOR. A missing or non-owned match on the mine
mutation returns `404`.

Match records are created by the AI matching job through its MongoDB upsert;
`POST /tor-matches` is removed for every role, including admins. `/ensure` only
queues computation and does not accept caller-supplied match results.

Generic PATCH/DELETE are admin-only. Vendors receive `403` even for their own
match ID and cannot change score, reason, TOR, or owner through those operations.
The own-only `/mine/{id}` handler reads only `dismissed` and `badResult` intent;
extra fields such as `matchPercent`, `matchReason`, `torId`, and `userId` are not
forwarded to persistence. Dismissal/restore writes only `dismissedAt`; bad-result
feedback sets `badResultAt` and `dismissedAt`. Both updates filter by the stored
owner and session subject, so a non-owned match returns `404`.

`/mine` ignores caller-supplied user IDs and uses the session subject, including
for admins. Read responses contain stored match fields. Admin generic PATCH still
passes the supplied update to the repository; no new admin field allowlist is
introduced by the vendor restrictions.

`/pending` returns shared job TOR IDs, not other vendors’ match records.
`/ensure` queues eligible TORs for shared worker processing; it is not scoped to
only the caller’s profile and does not return completed scores.
`GET /mine` currently removes matches that are no longer eligible as a cleanup
side effect.

## 9. Administrator operations

Every `/admin` endpoint requires an admin session, including GET operations.
Except PDF delivery, successful responses below use `200 application/json`.

| Method | Path | Input | Response / purpose |
| --- | --- | --- | --- |
| GET | `/admin/overview` | None | `{tracked,hidden,queue,departments,accuracy,thresholds,sources,recentRuns}` |
| GET | `/admin/sources` | None | `{sources,runs}` with counts, verdicts and latest runs |
| GET | `/admin/review` | Review filters below | `{total,items,thresholds,budgetYears}` |
| POST | `/admin/review/rescore` | `{reason}` | `{scored,vertexScored,skippedExpired}` |
| POST | `/admin/review/{id}` | `{decision,reason,fields?}` | Presented TOR after review |
| GET | `/admin/tors` | Catalog filters below | `{total,skip,limit,items,budgetYears}` |
| POST | `/admin/tors/bulk` | `{ids,action,reason}` | `{matched,modified}` |
| GET | `/admin/tors/{id}` | TOR ID | Presented TOR including detail/PDF metadata |
| GET | `/admin/tors/{id}/pdf` | TOR ID | PDF bytes, inline Content-Disposition, private five-minute cache |
| PATCH | `/admin/tors/{id}` | `{reason,...editableFields}` | Presented updated TOR |
| GET | `/admin/audit` | `q`, `action`, `targetType`, `skip`, `limit` | `{total,skip,limit,items}`; default 50, maximum 200 items |
| GET | `/admin/users` | None | `{items:[...]}` with identity, role, completeness and profile metadata |
| GET | `/admin/users/{id}` | User ID | User details and associated profile summary |
| PATCH | `/admin/users/{id}` | `{reason,role?,disabled?}` | `{id,role,disabled}` |
| POST | `/admin/certificates` | Certificate review body below | `{certificates,completeness}` |
| GET | `/admin/matches` | None | `{counts:{pending,running,waiting,complete},failed}` |
| POST | `/admin/matches/retry` | `{reason,id?}` | `{modified}`; omit job ID to retry jobs with errors |
| GET | `/admin/settings` | None | Keyword lists, thresholds and `updatedAt` |
| POST | `/admin/settings/preview` | `{includeKeywords?,excludeKeywords?}` | Current/next match counts and sample added/removed titles |
| POST | `/admin/settings/apply` | `{reason,includeKeywords?,excludeKeywords?,autoThreshold?,reviewThreshold?}` | `{hidden,restored,autoThreshold,reviewThreshold}` |
| POST | `/admin/line-digest/run` | None | `{sent,tors,recipients}`, or `{sent:0,skipped:true}` / `{sent:0,quotaExhausted:true}` |

`reason` must contain at least three characters after trimming wherever shown.
Admin write actions generally record an audit entry. IDs for `/admin/matches/retry`
identify matching-job documents, not TOR-match documents.

### Review and catalog query parameters

| Parameter | `/admin/review` | `/admin/tors` |
| --- | --- | --- |
| `q` | Title/titleTh/refId search | Also searches department/departmentTh |
| `source`, `year`, `stage` | Comma-separated values | Comma-separated values |
| `category` | Comma-separated category values | Not implemented |
| `band` | `manual`, `review` | Not implemented |
| `review` | Not implemented | Comma-separated stored review statuses |
| `visibility` | Not implemented | `visible`, `hidden` |
| `hidden` | Not implemented | `true` or `false` fallback visibility filter |
| `integrity` | Not implemented | `watch`, `clear` |
| `budget` | Not implemented | `specified`, `missing` |
| `status` | Not implemented | Exact stored status |
| `skip`, `limit` | Offset; default 40, maximum 100 items | Same |
| `sort` | `closingFirst` (default), `confidenceAsc`, `confidenceDesc`, `newest`, `deadlineAsc`, `budgetDesc` | `newest` (default), `oldest`, `budgetDesc`, `confidenceDesc`, `confidenceAsc` |

Use a non-negative skip and a positive limit. Stage filtering follows the current
business-stage rules in `scoring.js`, including Bangkok date windows. The review
queue selects eligible, visible, unapproved records needing review rather than
every stored TOR. Supply short search text for `q` and use the dedicated filters
for structured searches.

### Admin write bodies

- **Review:** `decision` is `approve`, `fix`, or `reject`. `fields` for `fix` may
  contain `budgetThb`, `deadline`, `category`, `department`, `departmentTh`, `status`,
  and `publishedAt`. Rejecting hides the record. Approve/fix marks it approved;
  it does not automatically clear every existing hidden flag.
- **Edit TOR:** accepted editable fields are `title`, `titleTh`, `category`,
  `budgetThb`, `budgetYear`, `deadline`, `publishedAt`, `status`, `department`,
  `departmentTh`, `summary`, `summaryTh`, and `hidden`, plus the required reason.
- **Bulk TORs:** `ids` must be a non-empty array. `action` is `hide`, `restore`,
  or `review` (sets manual review status).
- **Users:** role values are `public`, `vendor`, `admin`; `disabled` is boolean.
- **Certificate review:** identify a profile with `profileId` or `userId`. To add
  a metadata entry, send `name` without `index`. To edit an entry, send its
  zero-based `index`, optional `name`, `issuer`, `status`, and `note`, plus reason.
  Status values are `pending`, `approved`, `rejected`. This operates on the
  profile's `certificates` metadata array, not the three PNG path arrays.
- **Settings:** keyword lists accept arrays or comma/newline-separated text.
  Empty lists fall back to existing defaults. Default thresholds are auto 90 and
  review 80; inspect `/admin/settings` for current stored values.

Example review:

```json
{
  "decision": "fix",
  "reason": "Verified budget against the official document",
  "fields": {"budgetThb":1200000,"category":"Web Application"}
}
```

## 10. Source synchronization

All routes in this table are admin-only POST requests. No request body is required.

| Method | Path | Work triggered |
| --- | --- | --- |
| POST | `/sync` | Configured manual batch (currently dataGoProcess5, then SME announcement enrichment) |
| POST | `/sync/all` | Alias for full source sync |
| POST | `/sync/process3-process5` | Process3/Process5 pipeline |
| POST | `/sync/data-go-process5` | data.go discovery and Process5 pipeline |
| POST | `/sync/bma-egp2` | BMA e-GP2 source |
| POST | `/sync/egp-rss` | Official e-GP RSS source |
| POST | `/sync/data-go` | data.go e-GP source |
| POST | `/sync/sme-announcements` | Enrich stored SME-GP announcement budgets |
| POST | `/sync/ocr` | Extract/enrich stored EGP-PROCESS5 TORs |
| POST | `/sync/ocr/bma` | Extract/enrich stored BMA-EGP2 TORs |

These controllers await the sync/extraction work and return
`200 {"message":"<operation result>","data":...}`. Matching queued by that work
can continue after the response. Failures return `500 {"message":...}` and are
recorded against the sync run when possible. Provider credentials/configuration
are supplied on the backend; clients do not send provider API keys here.
The automatic ingestion job also visits the alternate source feeds; it does not
call the HTTP API. Fetched/adapted rows are inserted or updated directly through
`torRepository.saveChanged()`. No client-supplied TOR creation body is accepted by
these sync controllers.

## 11. LINE account linking and notifications

| Method | Path | Access | Input / success |
| --- | --- | --- | --- |
| GET | `/line/status` | Vendor/admin | `200` current user's linking status |
| POST | `/line/link/start` | Vendor/admin | No body; `200` status plus linking instructions |
| POST | `/line/unlink` | Vendor/admin | No body; `200` unlinked status |
| PATCH | `/line/digest` | Vendor/admin | `{enabled:boolean}`; `200` updated status |
| POST | `/line/webhook` | LINE signature | LINE events JSON; `200` empty acknowledgement |

Status response fields are `linked`, `digestEnabled`, `linkedAt`, `pendingCode`,
`pendingExpiresAt`, and `oaAddUrl`; absent dates/codes/URLs may be null. Start-link
creates a six-character code expiring after 15 minutes. The user sends the code
to the LINE Official Account, whose signed webhook completes linking.

Digest updates reject non-booleans with `400`; enabling requires a linked LINE
account. Unlink clears the linking fields and disables the digest.

Webhook requests use `Content-Type: application/json` and `x-line-signature`, the
Base64 HMAC-SHA256 of the exact body bytes using the configured channel secret.
Missing/invalid signatures receive `401 {"message":"Invalid signature"}`. The
server acknowledges valid requests before processing events; a `200` acknowledgement
does not guarantee every event or notification completed successfully.

## 12. Email alert preferences

| Method | Path | Access | Input / success |
| --- | --- | --- | --- |
| GET | `/email-alerts/preferences` | Vendor/admin; own session | `200` preferences plus `deliveryConfigured` |
| PUT | `/email-alerts/preferences` | Vendor/admin; own session | Complete preference body below; `200` saved preferences plus `deliveryConfigured` |

Both operations use the signed-in user’s ID, including for admins. There is no
endpoint here to change another user’s preferences or send an arbitrary email.
PUT requires all six fields below; partial settings objects receive `400`.

| Field | Validation | Default returned before first save |
| --- | --- | --- |
| `emailMatches` | Boolean | `true` |
| `emailDeadlines` | Boolean | `true` |
| `emailIntegrity` | Boolean | `false` |
| `budgetMinThb` | Finite non-negative number | `1000000` |
| `budgetMaxThb` | Finite number >= minimum | `20000000` |
| `categories` | Unique array of supported strings | `["Web Application","AI / Analytics"]` |

Supported categories: `Software Development`, `Web Application`,
`Mobile Application`, `Data Platform`, `Digital Platform`, `AI / Analytics`,
`Cybersecurity`, `GIS`, `Others`. An empty array means no category restriction.
Extra fields are not persisted by this service. The server controls `savedAt`,
`matchSince`, and `integritySince`; those dates may appear after preferences are
saved. `deliveryConfigured` reports whether a Resend key and `EMAIL_FROM` exist;
it does not prove provider availability or successful delivery.

```json
{
  "emailMatches": true,
  "emailDeadlines": true,
  "emailIntegrity": false,
  "budgetMinThb": 1000000,
  "budgetMaxThb": 20000000,
  "categories": ["Web Application", "AI / Analytics"]
}
```

Unconfigured delivery does not prevent saving preferences. Delivery jobs require
an enabled, verified account and use its current `User.email`, not vendor-profile
email or removed UserBio data. Current delivery checks require an active match
of at least 60%, visible/eligible TOR and matching preferences. Deadline alerts
use a three-day window. Returned defaults alone are not a saved opt-in: eligible
email recipients must have saved preferences. Missing users receive `404`;
invalid preference bodies receive `400`.

## 13. In-app notifications

| Method | Path | Access | Input / success |
| --- | --- | --- | --- |
| GET | `/notifications/mine` | Vendor/admin; own session | `200` own non-dismissed notifications, newest first |
| PATCH | `/notifications/mine/read-all` | Vendor/admin; own session | No body; `200 {ok:true}` |
| PATCH | `/notifications/mine/{id}` | Vendor/admin; own session | `{read?:boolean,dismissed?:boolean}`; `200` updated notification |

Records contain `_id`, unique `key`, `userId`, `torId`, `kind` (`match`, `risk`,
`deadline`), `body`, `bodyTh`, `read`, `dismissed`, and timestamps. The list is an
unpaginated stored-record array. Jobs create notifications; there is no public
notification-creation endpoint.

Updates match both notification ID and session user ID; missing/non-owned records
return `404`. At least one boolean `read` or `dismissed` is required, otherwise
`400`. Additional fields are ignored, so callers cannot change owner, TOR, text,
or kind through this endpoint. Setting `dismissed:false` can restore an owned
notification by ID. Read-all marks unread, non-dismissed records only. Admins
operate on their own notifications here and cannot select another user by query.

## 14. Next.js endpoints on the frontend host

These two endpoints run on port 3000 in local development. They are separate from
the Express server and do not pass through its global write middleware.

| Method | Full path | Access | Response |
| --- | --- | --- | --- |
| GET | `/api/sources/health` | Admin, verified through backend | `{probedAt,summary,results}` from live source probes |
| GET | `/api/admin/tors/{id}/pdf` | Admin, verified through backend | PDF bytes proxied on the Next.js host |

The PDF proxy checks the ID format, forwards the session cookie to the backend
admin TOR lookup, checks the PDF host, and verifies PDF magic bytes. It returns
`400` for invalid IDs/hosts, `401` for missing sessions, backend authorization/status
errors as applicable, `404` for no attached PDF, and `502` for upstream download or
non-PDF responses. Successful delivery is inline `application/pdf` with a private
five-minute cache. `/sources/health` performs network probes; it is not the same
as the stored source-run report at backend `/admin/sources`. Source health returns
`401` for missing/invalid sessions, `403` for non-admin users, and `503` if its
backend authentication request cannot be completed.

## 15. Calling the API

Authenticated JSON request from the browser (the browser supplies Origin):

```javascript
const tokenResponse = await fetch("http://localhost:5175/api/auth/csrf", {
  credentials: "include", cache: "no-store"
});
const { csrfToken } = await tokenResponse.json();
const response = await fetch("http://localhost:5175/api/line/digest", {
  method: "PATCH",
  credentials: "include",
  headers: {"Content-Type":"application/json","x-csrf-token":csrfToken},
  body: JSON.stringify({enabled:true})
});
const result = await response.json();
if (!response.ok) throw new Error(result.message || "Request failed");
```

Public request using curl:

```bash
curl 'http://localhost:5175/api/tors/category-distribution'
```

For manual authenticated testing, a valid Google credential can establish a cookie
jar. First obtain the CSRF cookies and token. Use an Origin listed in `CORS_ORIGIN`.
Replace placeholders locally; do not commit credentials, token values or cookie jars.

```bash
curl -c /tmp/torrent-api-cookies.txt \
  -H 'Origin: http://localhost:3000' \
  'http://localhost:5175/api/auth/csrf'

curl -b /tmp/torrent-api-cookies.txt -c /tmp/torrent-api-cookies.txt \
  -H 'Origin: http://localhost:3000' \
  -H 'x-csrf-token: <csrfToken from the preceding response>' \
  -H 'Content-Type: application/json' \
  -d '{"credential":"<valid Google ID token>"}' \
  'http://localhost:5175/api/auth/google'

curl -b /tmp/torrent-api-cookies.txt \
  'http://localhost:5175/api/auth/me'

```

The login example assumes an existing account. Include `role` only when creating
a new account. After login, fetch `/auth/csrf` again using the updated cookie jar
before the next write, including logout, because the token is now bound to the
JWT. Supply the refreshed header token and allowed Origin on that write. The
shared frontend client handles this exchange, cookies, JSON headers, and errors.

## 16. Errors and current response behavior

Most controller-generated errors use:

```json
{"message":"Description of the error"}
```

Google registration conflicts, CSRF failures, and rate-limit failures may also
contain a `code`. Thrown errors reaching the central error handler use JSON;
malformed JSON receives `400 {message:"Invalid JSON body."}`, and unexpected 5xx
messages are sanitized there. Some generic controllers still send their caught
error’s message directly. Unmatched routes fall through to Express’s default 404
response and are not guaranteed to use JSON; callers should handle non-JSON bodies.

| Status | Typical meaning |
| --- | --- |
| 400 | Explicit input validation failure or malformed input |
| 401 | Missing/invalid/expired local session, invalid Google credential, invalid webhook signature |
| 403 | Invalid Origin/CSRF token or role/ownership rejection |
| 404 | Missing resource or unmatched route |
| 409 | Registration/link conflict or duplicate vendor profile |
| 405 | TRACE or another unsupported HTTP method |
| 413 | File/request exceeds an enforced size limit |
| 429 | Per-client rate limit exceeded; inspect `Retry-After` |
| 500 | Database, provider, parser or other server failure |
| 502 | Upstream PDF failure on paths that map the error to a gateway failure |
| 503 | Next.js source-health authentication service unavailable |

Not all generic CRUD validation errors currently map to `400`. Clients should
handle unexpected `5xx` responses and avoid treating error-message text as a
stable contract. Do not assume a uniform status/schema across every route.

## 17. Implementation references

The request flow is HTTP method/framing guards, security headers, CORS and cookie
parsing, the public rate-limited CSRF endpoint, global API authentication,
Origin/CSRF checks, admin-write rate limiting, JSON parsing (including LINE raw
bytes), Google-login rate limiting, then route middleware and controllers. A
middleware can return an error immediately instead of calling the next handler.

- [Application and mounted routers](../backend/src/app.js)
- [Global API authentication](../backend/src/middleware/requireMutationAuth.js)
- [CSRF token generation and validation](../backend/src/middleware/csrfProtection.js)
- [Session verification](../backend/src/middleware/requireAuth.js)
- [JWT and cookie settings](../backend/src/utils/session.js)
- [Endpoint route definitions](../backend/src/routes)
- [Controllers and response status handling](../backend/src/controllers)
- [Mongoose field definitions](../backend/src/models)
- [Admin filters and action bodies](../backend/src/services/admin/adminService.js)
- [Browser API client](../frontend/src/lib/api.ts)
- [Mutation authentication regression tests](../backend/tests/auth/mutationAuth.test.js)

## 18. Verification and maintenance

Documentation reconciliation on 21 November 2026:

- Checked all 73 registered Express method/path combinations, including conditional
  diagnostics and the CSRF endpoint, against the endpoint tables.
- Checked both Next.js API handlers against the frontend endpoint table.
- Checked role/ownership middleware, controller/service write handling, response
  projections, session settings, upload constants, and notification/email settings.
- Confirmed removed manual user/TOR/match creation and standalone UserBio APIs are not
  listed as available operations.
- Checked relative implementation links resolve from this document.

Useful existing regression checks, run from `backend/` with dependencies installed:

```bash
node --require module-alias/register --test tests/auth/mutationAuth.test.js tests/auth/securityHardening.test.js tests/auth/torMatchAuthorization.test.js tests/sync/sync.test.js tests/vendor/certificateUploads.test.js tests/notifications/lineNotifications.test.js tests/vendor/vendorType.test.js tests/admin/categoryDistribution.test.js tests/admin/departmentBudget.test.js
```

HTTP tests bind temporary localhost ports. MongoDB aggregate integration cases
require an explicitly configured `TOR_AGGREGATION_TEST_URI`; they are skipped when
it is absent. A source/documentation review is not a deployed-system test. Record
the actual test command, result, and environment when using this document as issue
acceptance evidence.

For subsequent changes, verify that guests/public accounts cannot use private
routes; vendors cannot read another user’s protected resources; admin-only reads
reject vendors; field allowlists match accepted and returned fields; and conditional
routes, request limits, errors, and job side effects remain accurately described.
The broad generic admin user/TOR/match update behavior noted above is still present.
Match creation is job-only and vendor feedback is owner-scoped and field-restricted;
those changes alone do not establish complete ASVS coverage.

Keep this reference synchronized when routes, request/response shapes, ownership
checks, cookies or CSRF protections change. The SRS records the intended behavior;
this reference records the current API behavior, including incomplete controls.

