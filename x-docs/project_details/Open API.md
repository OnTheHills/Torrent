# TORRENT REST API reference

Updated: 9 November 2026.

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
- No backend `PUT` endpoint is currently registered. The global authentication
  middleware covers PUT requests if a route is added later.
- Public TOR responses generally use `_id`; admin TOR presentation uses `id`.
  Omitted fields, optional fields and `__v` may vary by stored document.

## 2. Authentication and access

### Session cookie

Successful Google authentication sets the `torrent_session` cookie containing a
signed JWT with `sub` (local user ID), `role`, `email`, `iat`, and `exp` claims.
The response body contains user data; the local JWT is not returned as a body field.

| Setting | Current behavior |
| --- | --- |
| `HttpOnly` | Enabled |
| `SameSite` | `lax` |
| `Secure` | Enabled when `COOKIE_SECURE=true` |
| Cookie path | `/` |
| Cookie maximum age | Seven days |
| JWT lifetime | `JWT_EXPIRES_IN`, default `7d` |

Browser requests that need the session must use `credentials: "include"`.
The API expects the session cookie; an `Authorization: Bearer ...` header alone
does not authenticate these routes. `CORS_ORIGIN` is a comma-separated allowlist
of frontend origins, with credentialed CORS responses enabled.

### Authentication for writes

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

GET, HEAD, and OPTIONS do not acquire a new login requirement from this global
middleware. Existing private GET routes remain private. CORS preflight is handled
before route authentication.

### Access labels used below

| Label | Meaning |
| --- | --- |
| Public | No local session required |
| Session | Any valid local session; no extra role/owner restriction on that route |
| Self/admin | Session subject matches the requested user ID, or role is `admin` |
| Owner/admin | Session owns the vendor profile/certificate, or role is `admin` |
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

Logout clears the session cookie in that browser. The access labels describe
authentication requirements; they are not a claim of complete security compliance.

## 3. Health endpoints

These paths are on the Express host and are not both under the `/api` base.

| Method | Full path | Access | Success response |
| --- | --- | --- | --- |
| GET | `/` | Public | `200 {"message":"Backend is running"}` |
| GET | `/api/hello` | Public | `200 {"message":"Hello from Express!"}` |

These responses confirm the HTTP application is reachable; they are not a full
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

Google authentication errors can include:

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | Not supplied | Missing credential |
| 401 | `invalid_credential` | Google credential verification failed |
| 403 | `account_disabled` | Local account is disabled |
| 404 | `email_unknown` | Login requested for an unregistered account |
| 409 | `email_registered` | Registration requested for an existing account |
| 409 | `email_linked` | Email is linked to a different Google subject |

## 5. Users

| Method | Path | Access | Success |
| --- | --- | --- | --- |
| POST | `/users` | Admin | `201` created user |
| GET | `/users` | Admin | `200` user array |
| GET | `/users/{id}` | Self/admin | `200` user |
| PATCH | `/users/{id}` | Self/admin | `200` updated user |
| DELETE | `/users/{id}` | Admin | `200` deleted user |

Ordinary profile fields include `username`, `firstname`, and `lastname`. Admin
creation also accepts account fields defined in the User model, including required
unique `email`, and `role` (`public`, `vendor`, `admin`). End-user registration
should use `/auth/google`.

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
| POST | `/vendor-profiles` | Session; owner bound to session | `201` created profile |
| GET | `/vendor-profiles` | Public | `200` profile array |
| GET | `/vendor-profiles/get/{userId}` | Self/admin | `200` profile for that user |
| GET | `/vendor-profiles/{id}` | Public | `200` profile by profile ID |
| PATCH | `/vendor-profiles/{id}` | Owner/admin | `200` updated profile |
| DELETE | `/vendor-profiles/{id}` | Owner/admin | `200` deleted profile |
| GET | `/vendor-profiles/certificates/{filename}` | Owner/admin | `200 image/png` |

Creation binds `userId` to the signed-in user. Updates cannot change the owner.
The general profile GET endpoints currently return stored profile data publicly;
certificate image delivery has its own owner/admin checks.

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

## 7. User bios

| Method | Path | Access | Success |
| --- | --- | --- | --- |
| POST | `/user-bios` | Session | `201` created bio |
| GET | `/user-bios` | Public | `200` bio array |
| GET | `/user-bios/{id}` | Public | `200` bio |
| PATCH | `/user-bios/{id}` | Session | `200` updated bio |
| DELETE | `/user-bios/{id}` | Session | `200` deleted bio |

The bio schema contains required unique `userId`, optional `userPhone`, and optional
`userEmail`. `{id}` is the bio document's ID. These mutation routes require a
session through the global write middleware.

```json
{"userId":"507f1f77bcf86cd799439011","userPhone":"<example phone number>","userEmail":"vendor@example.test"}
```

## 8. TOR catalog and dashboard aggregates

| Method | Path | Access | Request / success |
| --- | --- | --- | --- |
| GET | `/tors` | Public | `200` non-hidden TOR array, newest published first |
| GET | `/tors/budget-peers` | Public | Required query `category`; `200` array with `_id`, `budgetThb`, `category` |
| GET | `/tors/top-departments-by-budget` | Public | `200 {departments:[{department,totalBudget,torCount}]}` |
| GET | `/tors/category-distribution` | Public | `200 {categories:[{category,frequency}]}` |
| GET | `/tors/{id}` | Public | `200` TOR detail; hidden/missing TOR returns `404` |
| POST | `/tors` | Admin | TOR JSON; `201` created TOR |
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

TOR create/update may queue asynchronous matching; a successful HTTP response does
not mean every vendor score is ready. TOR detail reads may also persist missing
English translations/requirement grouping during enrichment.

## 9. Vendor–TOR matches

| Method | Path | Access | Request / success |
| --- | --- | --- | --- |
| POST | `/tor-matches` | Session | Match JSON; `201` created match |
| GET | `/tor-matches` | Public | `200` match array |
| GET | `/tor-matches/pending` | Public | `200` array of TOR IDs with unfinished matching jobs |
| GET | `/tor-matches/mine` | Session | `200` signed-in user's eligible match array |
| PATCH | `/tor-matches/mine/{id}` | Session; scoped to current user | Dismiss/report body; `200` updated match |
| POST | `/tor-matches/ensure` | Session | `{torIds:[...]}`; `200 {queued:number}` |
| GET | `/tor-matches/{id}` | Public | `200` match |
| PATCH | `/tor-matches/{id}` | Session | Match changes; `200` updated match |
| DELETE | `/tor-matches/{id}` | Session | `200` deleted match |

Match records have required `userId` and `torId`, plus `matchPercent`, `matchReason`,
`dismissedAt`, `badResultAt`, and timestamps. `matchPercent` is stored as MongoDB
Decimal128 and may serialize as an Extended JSON decimal object rather than a
JavaScript number. Use the `/mine` operations for user-specific dismiss/report
actions; these operations scope the match lookup to the signed-in user.

```json
{"dismissed":true}
```

Send `{"dismissed":false}` to restore a dismissal or `{"badResult":true}` to mark
the match as a bad result and dismiss it. An empty body defaults to dismissal.
`{id}` identifies a match, not its TOR. A missing or non-owned match on the mine
mutation returns `404`.

`/ensure` queues eligible TORs for the worker; it does not return completed scores.
`GET /mine` currently removes matches that are no longer eligible as a cleanup
side effect.

## 10. Administrator operations

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
| POST | `/admin/line-digest/run` | None | Digest result; temporary manual QA operation |

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

## 11. Source synchronization

All routes in this table are admin-only POST requests. No request body is required.

| Method | Path | Work triggered |
| --- | --- | --- |
| POST | `/sync` | Full configured source sync |
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

## 12. LINE account linking and notifications

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

## 13. Next.js endpoints on the frontend host

These two endpoints run on port 3000 in local development. They are separate from
the Express server and do not pass through its global write middleware.

| Method | Full path | Access | Response |
| --- | --- | --- | --- |
| GET | `/api/sources/health` | Public | `{probedAt,summary,results}` from live source probes |
| GET | `/api/admin/tors/{id}/pdf` | Admin, verified through backend | PDF bytes proxied on the Next.js host |

The PDF proxy checks the ID format, forwards the session cookie to the backend
admin TOR lookup, checks the PDF host, and verifies PDF magic bytes. It returns
`400` for invalid IDs/hosts, `401` for missing sessions, backend authorization/status
errors as applicable, `404` for no attached PDF, and `502` for upstream download or
non-PDF responses. Successful delivery is inline `application/pdf` with a private
five-minute cache. `/sources/health` performs network probes; it is not the same
as the stored source-run report at backend `/admin/sources`.

## 14. Calling the API

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

## 15. Errors and current response behavior

Most controller-generated errors use:

```json
{"message":"Description of the error"}
```

Google authentication errors may also contain a `code`. Framework body-parser and
unmatched-route errors are not guaranteed to use this JSON envelope; callers
should handle an unreadable/non-JSON error body.

| Status | Typical meaning |
| --- | --- |
| 400 | Explicit input validation failure or malformed input |
| 401 | Missing/invalid/expired local session, invalid Google credential, invalid webhook signature |
| 403 | Invalid Origin/CSRF token, role/ownership rejection, or disabled account during login |
| 404 | Missing resource or unmatched route |
| 409 | Registration/link conflict or duplicate vendor profile |
| 413 | File/request exceeds an enforced size limit |
| 500 | Database, provider, parser or other server failure |
| 502 | Upstream PDF failure on paths that map the error to a gateway failure |

Not all generic CRUD validation errors currently map to `400`. Clients should
handle unexpected `5xx` responses and avoid treating error-message text as a
stable contract. Do not assume a uniform status/schema across every route.

## 16. Implementation references

The request flow is CORS, cookie parsing, global write authentication, Origin/CSRF checks, JSON parsing
(including LINE raw-body capture), then route middleware and controllers. A
middleware can return an error immediately instead of calling the next handler.

- [Application and mounted routers](../../backend/src/app.js)
- [Global write authentication](../../backend/src/middleware/requireMutationAuth.js)
- [CSRF token generation and validation](../../backend/src/middleware/csrfProtection.js)
- [Session verification](../../backend/src/middleware/requireAuth.js)
- [JWT and cookie settings](../../backend/src/utils/session.js)
- [Endpoint route definitions](../../backend/src/routes)
- [Controllers and response status handling](../../backend/src/controllers)
- [Mongoose field definitions](../../backend/src/models)
- [Admin filters and action bodies](../../backend/src/services/admin/adminService.js)
- [Browser API client](../../frontend/src/lib/api.ts)
- [Mutation authentication regression tests](../../backend/tests/mutationAuth.test.js)

Keep this reference synchronized when routes, request/response shapes, ownership
checks, cookies or CSRF protections change. The SRS records the intended behavior;
this reference records the current API behavior, including incomplete controls.
