# TORRENT logging inventory

## ASVS V16.1.1 inventory

| Source | Events and format | Storage and use | Access and retention |
| --- | --- | --- | --- |
| Express/backend runtime and jobs | JSON Lines: HTTP completion records; Google login/logout outcomes; auth, role, CSRF and rate-limit denials; server errors; database/server state; sync, matching, OCR/upstream fetch, certificate, LINE, email and Vertex events. Records use UTC timestamps and event codes; request logs include a request ID and coarse route metadata. | stdout for `info`/`debug`, stderr for `warn`/`error`; collected by the container/host runtime for operations and security investigations. No app API reads this stream. | Read access belongs to the host/container or external log-provider operators. The repo configures no log driver, ACL, rotation, or retention period; host/provider policy applies. Exact client IPs are included in request/security records. |
| Next.js frontend and browser | JSON error records for TOR catalog, budget-peer, TOR detail, and vendor-profile submission failures. Only fixed event codes and timestamp/level/service metadata are emitted. | Server-side output goes to the Next.js container runtime. Client-side output stays in the browser console; it is not sent to a central collector by the app. Used for debugging failed UI/API operations. | Server output follows runtime/provider access and retention. Browser-console access and lifetime depend on the user's browser/devtools; the app does not persist it. |
| MongoDB `audit_logs` | BSON audit documents: actor ID/email/role, action, target, optional free-text reason and before/after changes, UTC `createdAt`, and request ID when available. | Persistent `mongo_data` volume. Used by the admin audit view and for administrator-action accountability. | `GET /api/admin/audit` is guarded by authenticated-admin middleware; the frontend reaches it through that API. The backend's configured MongoDB connection reads/writes the collection; production privileges are deployment-defined. Local Compose MongoDB has no DB authentication and is host-accessible on loopback. No TTL index or application purge policy is configured, so records persist until external/manual deletion. |
| MongoDB `sync_runs` | BSON operational records: source, trigger, status, UTC start/finish, duration, requester ID/email, request ID, counters, and sanitized error summary. | Persistent `mongo_data` volume. Used by admin overview/source health screens to investigate sync and OCR/upstream processing. | Read through admin-only overview/source APIs; the backend's configured MongoDB connection reads/writes these records. Same local DB access caveat as `audit_logs`. No TTL index or application purge policy is configured. |
| MongoDB server logs | No MongoDB audit-log policy or separate MongoDB log sink is configured by this repo. | Database process diagnostics follow the container/runtime configuration; no app API reads them. | Runtime operators control access. This repo sets no retention or rotation period. |
| Google/LINE provider telemetry | Provider-side login/security events are not ingested by the app; app-generated auth, account-link, webhook, and failure events are listed under backend runtime. | Retained in Google/LINE provider services and consoles, outside this repository. | Provider-console roles and provider retention policies apply; verify them separately if this evidence is required. |
| Operator CLI/setup scripts | `backend/scripts` writes command results and failures directly to stdout/stderr; these are operator command outputs, not application telemetry or the shared JSON logger. Some commands can include a supplied email or error detail. | Local terminal or one-off setup/diagnostic container output; used by the operator running that command. | Access and lifetime depend on the host terminal or one-off container runtime. No central sink or retention policy is configured here; do not treat this output as the audit trail. |

Only `session_revocations` has an application-defined TTL index; it expires revoked-session state and is not a log-retention policy. Neither `audit_logs` nor `sync_runs` has a TTL index.

### Deployment verification checklist

- Record the production runtime log destination, reader roles, retention period, rotation/deletion behavior, and retrieval test.
- Record MongoDB production reader/writer roles, backup access, and retention/deletion periods for `audit_logs` and `sync_runs`.
- Confirm whether browser-console errors are intentionally local; add an approved central client-error sink only if required.
- Verify Google/LINE provider log access and retention in their consoles if provider-side authentication evidence is required.
- Keep operator CLI output separate from the production security log inventory and check that commands do not expose secrets.

## Runtime log stream

The backend writes one JSON object per line through Node's `console` API. `info` and `debug` go to stdout; `warn` and `error` go to stderr. The frontend's small error logger writes JSON event records through `console.error`; server-side output goes to the Next.js runtime, and browser-side output stays in that browser's console. The container/runtime log collector is the only external sink configured by this repository. The common backend envelope contains `timestamp` (ISO 8601 UTC), `level`, `service`, and `event`.

HTTP completion records include a server-generated `requestId` (also returned as `X-Request-Id`), method, route template, response status, duration, client IP, and authenticated actor ID/role when present. Query strings, request bodies, cookies, authorization headers, raw paths for unmatched routes, email addresses, and error messages/stacks are excluded. Security events use the same envelope and request ID; they include the event outcome and coarse route metadata. The logger redacts fields whose names indicate credentials, cookies, tokens, sessions, secrets, email, phone, or payment data.

Exact client IPs are retained in the runtime log stream to investigate anonymous requests and security events. Set retention and access controls in the deployment log provider; this repository does not configure provider retention.

## MongoDB operational records

- `audit_logs`: administrator actions, actor ID/email/role, action, target, reason, changed fields, UTC `createdAt`, and the originating `requestId` where the action came from an HTTP request. Email is retained here for the existing admin audit view. Access should remain limited to administrators.
- `sync_runs`: procurement sync execution state, UTC timestamps, trigger, source/status/counter summaries, sanitized error code/name, requester ID/email, and originating `requestId` for manual runs. Provider metadata, TOR records, URLs, request payloads, and raw error messages are excluded from the stored summary.

Credentials, session tokens, and request payloads are not intentionally written to either collection. Existing records are not rewritten by this change.

## Time and correlation

Runtime timestamps are generated in UTC with an explicit `Z` offset. Mongoose timestamps are BSON dates and are stored as UTC instants. The process uses the host clock; time synchronization is provided by the deployment/operating-system environment, not by application code. Search runtime logs and MongoDB action records by `requestId` to correlate a request with a resulting admin or manual-sync action.

## ASVS V16.2 verification notes

- **V16.2.1:** HTTP/security entries capture the event, UTC time, safe route, method, outcome/status, request ID, and available actor/IP metadata.
- **V16.2.2:** Application timestamps are UTC. Host clock synchronization must be verified in deployment configuration.
- **V16.2.3:** Runtime records go through the shared JSON logger; durable records go only to the documented MongoDB collections. A test rejects direct console writes elsewhere in `src`.
- **V16.2.4:** Runtime logs are JSON Lines with stable envelope fields and request IDs shared with durable admin/manual-sync records.
- **V16.2.5:** Request payloads, credentials, cookies, tokens, email fields, payment fields, and raw error messages/stacks are omitted or redacted. Sync history stores only status, source, counters, and sanitized error codes/names.

## ASVS V16.4 log protection

- **V16.4.1:** Backend output uses the shared JSON Lines logger. It removes CR/LF and Unicode line separators from event names, field names, and field values, JSON-encodes records, and validates error names/codes. Frontend call sites pass fixed event codes to a JSON-encoding logger; they do not include request errors or profile data. A regression test injects all four line separators and confirms a single parseable backend output line.
- **V16.4.2:** The admin audit API requires an authenticated admin and exposes only `GET /api/admin/audit`; there are no HTTP update or delete routes for audit entries. In Compose, only the backend shares the private database network with MongoDB; the frontend cannot connect to MongoDB directly. The MongoDB host port is bound to `127.0.0.1`, so it is not reachable from other network interfaces. Runtime logs are emitted to stdout/stderr for the container runtime to collect.

The repository does not configure production log-provider ACLs, retention, or immutable storage, and the local MongoDB development service does not enable database authentication. Verify production provider/database access controls and tamper protection in deployment configuration before claiming infrastructure-level log protection.

## Evidence collected

- `src/app.js` installs the request logger before the API routes. `src/middleware/requestLogger.js` emits one completion record per response with a generated request ID, method, route template, status, duration, client IP, and available actor ID/role.
- `src/controllers/auth/authController.js` records login success/failure and logout events. `src/middleware/requireAuth.js` and `src/middleware/requireRole.js` record authentication and authorization denials. `src/middleware/errorHandler.js` records unexpected server errors without including the raw error message or stack.
- The focused automated evidence command, run on 2026-11-22 from `backend/`, was `node --require module-alias/register --test tests/logging/generalLogging.test.js`: **13 passed, 0 failed**. These tests capture logger output and verify HTTP request records, auth/security event redaction, server-error logging, UTC timestamps, request correlation, safe backend/frontend sinks, and that the audit/sync schemas have no automatic TTL expiry.
- `tests/auth/auditLogProtection.test.js` dispatches requests through the real Express admin router and auth middleware: anonymous GET returns 401, vendor GET/mutations return 403, admin GET succeeds, and admin PATCH/DELETE return 404. This focused route test passes. `tests/auth/mutationAuth.test.js` also checks the route through the complete app stack, but that suite cannot start in this checkout because `backend/node_modules` is missing the declared `csrf-csrf` package.
- Frontend lint passed for the three changed files. `npx tsc --noEmit` could not complete because the checkout is missing the declared `lucide-react` package.

This evidence verifies application code and focused tests. It does not verify log retention or retrieval in a deployed log provider, which is configured outside this repository. The admin audit `reason` is free text stored in MongoDB; review it separately before claiming sensitive-data redaction is complete for every durable record.
