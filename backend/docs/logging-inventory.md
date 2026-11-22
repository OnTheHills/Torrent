# Backend logging inventory

## Runtime log stream

The backend writes one JSON object per line through Node's `console` API. `info` and `debug` go to stdout; `warn` and `error` go to stderr. The container/runtime log collector is the only external sink configured by this repository. The common envelope contains `timestamp` (ISO 8601 UTC), `level`, `service`, and `event`.

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

## Evidence collected

- `src/app.js` installs the request logger before the API routes. `src/middleware/requestLogger.js` emits one completion record per response with a generated request ID, method, route template, status, duration, client IP, and available actor ID/role.
- `src/controllers/auth/authController.js` records login success/failure and logout events. `src/middleware/requireAuth.js` and `src/middleware/requireRole.js` record authentication and authorization denials. `src/middleware/errorHandler.js` records unexpected server errors without including the raw error message or stack.
- The focused automated evidence command, run on 2026-11-22 from `backend/`, was `node --require module-alias/register --test tests/logging/generalLogging.test.js`: **8 passed, 0 failed**. These tests capture logger output and verify HTTP request records, auth/security event redaction, server-error logging, UTC timestamps, request correlation, and the shared logging sink.

This evidence verifies application code and focused tests. It does not verify log retention or retrieval in a deployed log provider, which is configured outside this repository. The admin audit `reason` is free text stored in MongoDB; review it separately before claiming sensitive-data redaction is complete for every durable record.
