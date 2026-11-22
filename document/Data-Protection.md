# Data protection inventory

Reviewed 2026-11-22 for ASVS V14.2. This describes repository behavior; the
deployment operator remains responsible for infrastructure settings and the
privacy terms governing external processors.

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
