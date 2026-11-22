# Data protection inventory

Reviewed 2026-11-22 for ASVS V14.2. This describes repository behavior; the
deployment operator remains responsible for infrastructure settings and the
privacy terms governing external processors.

## V14.1 — data classification and required protection

Policy effective 2026-11-22. Owner: project maintainer. The following levels apply
to data created, received, transformed, logged, cached, backed up, or sent to
processors. Apply the highest level present to a mixed record or file. Encoding,
hashing an identifier, or putting data inside a signed JWT does not automatically
lower its classification. A JWT payload and Base64 document data are readily
decoded; signing provides integrity, not confidentiality.

| Level | Data inventory and examples | Permitted use and access |
| --- | --- | --- |
| Public | Official TOR/project IDs, published procurement titles, budgets, dates, agency information and public-source documents; deliberately public vendor showcase fields. | Public catalog/reporting, with source lineage and integrity checks. Personal information appearing in a public PDF remains subject to the confidential-data rules below; public availability is not a blanket privacy exemption. |
| Internal | Nonpersonal sync counters, job states, classification configuration and technical operational metadata. | Backend processing and authorized admin/operations views. No unnecessary public exposure of internal configuration or infrastructure paths. |
| Confidential | Google subject/account IDs, email/name/picture, vendor contacts/location/capabilities/past projects, private certificate images/metadata, watchlists, preferences, match reasons/scores, notifications, LINE user IDs and message destinations; identifiers, IP addresses and changes in audit/request/sync records. | Account owner, explicitly authorized admin, and the minimum backend/provider processing needed for the feature. Model inputs/outputs, files, caches, backups and logs inherit this level when they contain these values. |
| Restricted | JWT/session cookies, Google ID credentials, CSRF tokens and linking codes, JWT/CSRF/cookie/LINE secrets, provider bearer tokens/API keys, Google private keys, database connection passwords and any legacy password-hash field. JWT claims include confidential identity data as well as a restricted bearer credential. | Only the required backend, browser cookie mechanism, or intended identity/provider protocol participant. Never public APIs, general logs, screenshots, committed source, analytics, or arbitrary model prompts. |

The model/location inventory in **Data and access**, the provider flows below,
and [Cryptographic.md](Cryptographic.md) together cover these data classes.
Also include session-revocation IDs/expiry in `session_revocations`, queued email
delivery references in `email_alerts`, match-worker cursors/leases in
`tor_match_jobs_by_tor`, and admin/sync records. These collections can link back
to people even when an email address is not stored directly.

| Protection requirement | Public / Internal | Confidential | Restricted |
| --- | --- | --- | --- |
| Encryption and confidentiality | Verify trusted source/transport; do not treat Base64 or the e-GP public URL format as confidential encryption. Internal data is admin/backend-only. | Require encrypted transport when crossing a device/service trust boundary and encrypted database volumes, upload storage and backups before using real sensitive data. Minimize full-value display/export. | Apply confidential requirements plus backend-only secret files/provider-managed credentials, least-privilege provisioning and rotation; bearer tokens are never included in URLs or ordinary browser storage. |
| Integrity | Validate inputs, retain source lineage and enforce authorized writes. | Bind ownership to verified sessions; validate file format, input/schema and model output; audit privileged changes. | Verify signatures/MACs with approved libraries; explicitly validate token type, audience and selected algorithm. Replace compromised credentials immediately. |
| Retention and deletion | Retain public procurement data for the project's reporting purpose; review internal job/history data at project close. | Proposed local-project policy: keep account/profile data while the account is active; action deletion requests within 30 days, remove associated uploads/matches through supported deletion flows, and purge remaining project copies within 30 days of project closure unless justified retention is recorded. | Do not persist incoming Google credentials beyond their verification request. Session/revocation validity follows configured expiry; link codes follow their TTL. Remove expired/revoked credential copies under the key lifecycle policy. |
| Logging and log access | Record operational events without unnecessary payloads. Internal logs are operator/admin-only. | Prefer IDs, route templates, status and timing over contact/content values. Protect any remaining actor/IP fields as confidential. Proposed retention: runtime logs 30 days, admin audit/sync history 90 days; access only by the designated operator/admin. | Never record passwords, raw cookies/tokens, Authorization headers, private keys, full connection strings or raw uploaded files. Redact errors before logging and never copy secrets into audit reasons. |
| Database/backups | Apply least-privilege network/DB access; public content does not justify a public database. | Require authenticated DB access, volume/database-level encryption and encrypted backups with reviewed access. Proposed backup retention: at most 30 days, including expiry after account deletion; document longer retention separately. | Keep runtime secrets outside domain collections and backups of application records; any authorized credential backup requires separate encrypted custody and lifecycle records. |
| Privacy and minimization | Do not extract/re-publish unnecessary personal details from public documents. | Use explicit response allowlists, masking for privileged contact views, owner-only APIs, memory-only authenticated client caches, pseudonymous/synthetic test fixtures and minimum necessary provider payloads. No advertising/analytics disclosure is authorized by this policy. | No plaintext secrets in client bundles or general datasets; use HttpOnly cookies for sessions and bounded transient handling for protocol tokens. |

These are documented requirements and proposed retention periods, not a claim
that automated purge jobs, encryption or provider retention settings already
exist. Existing local HTTP, unauthenticated MongoDB, unverified host/backup
encryption, and missing general retention scheduling remain implementation or
operational gaps. Until resolved, use synthetic/minimized data and restrict the
local stack; do not claim implemented V14.2.4 merely from this policy.

Privacy applicability must be recorded before real personal data is collected
or sent to a processor: identify affected users/jurisdictions, the purpose and
applicable privacy/data-protection obligations (including reviewing Thailand's
PDPA applicability), processor terms, geographic transfers, retention and
deletion handling. No legal-compliance determination is asserted here. Keep
identity/contact and certificate data confidential while applicability is being
resolved; student-project or local-only status does not remove that protection.

Review this classification whenever a schema, upload type, log field, processor
or export changes, and at least monthly during development. Document exclusions
and verify the inventory against both backend and frontend before assessment.
Preserve the V14.2 implementation evidence below rather than treating this new
classification as evidence of controls that are still missing.

## Data and access

| Data | Where it is used or stored | Access and purpose |
| --- | --- | --- |
| Account email, name, Google picture, role | MongoDB `users`; session and admin APIs | Needed for sign-in, account display, and role administration. Password hashes, Google subject IDs, LINE IDs, link codes, session versions, and alert preferences are excluded from auth and generic user responses. |
| Vendor name/contact, location, capabilities, projects, website, and certificate metadata | MongoDB `vendor_profiles` | Vendors manage their own profile; admins review it; matching uses relevant capability evidence. The profile API is owner/admin restricted. |
| Certificate images | `backend/upload` volume as PNG files; only profile paths are stored in MongoDB | Owner/admin can download through an authenticated attachment route. Files are created with mode `0600`; profile and account deletion remove the associated files and match records. Protect the upload volume and backups at the host level. |
| Watchlist, email-alert preferences, LINE linkage and notification settings | MongoDB `users` | Used only by the authenticated account and backend notification jobs; owner is taken from the verified session. |
| Admin audit and sync history | MongoDB `audit_logs` and `sync_runs` | Admin-only audit reads; sync records support operations. Actor IDs/emails remain in these records for accountability. |
| Public procurement records | MongoDB TOR collections and public API responses | Public catalog and reporting. The frontend may revalidate public TOR data for 60 seconds; these records are not account profile data. |

## Transport, cache, and response minimization

- Login credentials and mutation data are sent in request bodies; session tokens
  are HTTP-only cookies. The backend request logger records route templates and
  excludes query strings, bodies, cookies, and authorization headers.
- The data.go API key is sent in the `api-key` HTTP header, not the URL. This
  follows the [Data.go.th API developer manual](https://data.go.th/uploads/page_images/2025-07-08-051605.3384232025-03-07-DATAGOTH3USERMANUAL.pdf),
  which recommends keeping the key in an HTTP header.
- `requireAuth` marks authenticated API responses `private, no-store`, including
  authorization failures. The auth controller also disables caching for login,
  session, and logout responses. Sensitive Next.js session fetches use
  `cache: "no-store"`.
- React Query keeps fetched data in memory only. The session provider cancels
  pending queries and clears the query and mutation caches on logout, an expired
  session, or a change of account.
- Auth and generic user responses use an explicit allowlist of client identity
  fields. Vendor profile responses are returned only to the owner or an admin;
  admin detail views mask contact fields until the administrator selects “Show
  contact details.” The admin user list displays email addresses for account
  identification and email search.
- Profile deletion removes its image files and match rows. Account deletion
  first deletes the linked profile, then deletes the account. Audit and sync
  history is retained for accountability and is not cascaded away.

## Third-party data flows

- Google Identity Services supplies the short-lived ID credential; the backend
  verifies it with Google and stores the account identity fields needed by the
  application.
- data.go and the procurement-source APIs receive public procurement query
  terms or project identifiers. Provider API credentials remain backend-only.
- Vertex AI receives a bounded vendor capability/profile summary, selected TOR
  details, and the vendor's uploaded certificate images to calculate a match.
  Email, phone, and LINE account IDs are not included in that prompt. Configure
  and approve the Google Cloud project, region, access, and provider terms for
  the deployment before sending real vendor data.
- LINE receives linking/digest requests and messages for linked accounts.
  Resend receives enabled alert email addresses and message content. These are
  optional integrations configured by backend secrets.
- No analytics or advertising tracker is configured in the application source.

## Encryption, retention, and deployment limits

- The application uses TLS for configured HTTPS provider endpoints. The local
  Compose stack exposes the frontend and backend directly for development and
  does not terminate browser TLS. Production must terminate HTTPS at a trusted
  edge and use encrypted transport to any separately hosted database.
- The local Compose MongoDB has a persistent volume, no configured MongoDB
  authentication, and no MongoDB TLS. Compose restricts its host port to
  loopback and puts MongoDB on an internal network shared with the backend.
  Production must provide database authentication, network ACLs, encrypted
  disks/backups, and monitored backup access.
- The application does not encrypt profile fields or certificate files at the
  application layer. File permissions and route authorization are enforced;
  host-volume and backup encryption remain deployment controls.
- Session-revocation rows expire automatically at the session expiry. The
  application does not set automatic retention periods for accounts, profiles,
  uploaded certificates, audit logs, sync history, or backups. Profile/account
  deletion removes linked profile files and match rows, while audit/sync history
  persists. Operators must define, document, and enforce retention/deletion
  periods for those records and backups before a production privacy attestation.
- Runtime log source, redaction, and storage details are documented in
  [Logging.md](Logging.md). Deployment log-reader roles, retention, and deletion
  remain external settings.

## V14.2 verification notes

- **V14.2.1:** Provider keys and user credentials are not placed in application
  URLs; regression coverage asserts the data.go key is header-only.
- **V14.2.2:** Authenticated backend responses are non-cacheable, session fetches
  opt out of Next.js caching, and client query data is cancelled and cleared
  when a session ends or changes.
- **V14.2.3:** No tracker is configured. Documented external integrations are
  explicit product processors; production approval and provider terms require
  deployment-owner verification.
- **V14.2.4:** Authentication, role checks, private profile routes, certificate
  file access, audit logging, secret handling, and data flow are documented.
  Database encryption, backup policy, and retention periods require operational
  configuration and verification.
- **V14.2.6:** Auth/user APIs return only required identity fields; admin detail
  contact values are masked by default. No payment-card or government-ID fields
  are collected by the current profile schema.

Focused regression commands:

```sh
cd backend && node --require module-alias/register --test \
  tests/security/dockerSecrets.test.js tests/auth/mutationAuth.test.js \
  tests/user/dataProtection.test.js tests/vendor/certificateUploads.test.js \
  tests/notifications/lineNotifications.test.js
cd frontend && node --test tests/security-merge.test.cjs
```
