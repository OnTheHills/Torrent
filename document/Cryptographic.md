# Cryptographic key management and inventory

## key-management policy

Effective 2026-11-22. Policy owner: the project maintainer. The local operator
is the key custodian and must record their identity in the private operational
register described below. This policy applies to the local development/Docker
project; it does not claim that a deployed environment has been assessed.
Its lifecycle follows the generation, distribution, storage, active use,
deactivation, compromise handling, and destruction concepts in
[NIST SP 800-57 Part 1 Rev. 5](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final).
The review intervals below are project policy choices, not NIST-prescribed dates.

| Lifecycle stage | Required project practice |
| --- | --- |
| Register and authorize | Before enabling a credential, record its nonsecret ID, purpose, owner/custodian, authorized consumers, algorithm/key size where applicable, creation/activation date, rotation deadline, and state. Restrict usage to the inventory below. |
| Generate or obtain | Generate independent application signing secrets with an OS-backed CSPRNG, for example `openssl rand -base64 64`; do not choose memorable strings. Obtain provider credentials from the provider's authenticated management console. Obtain service-account private keys from Google; never invent or copy a teammate's private key. |
| Distribute and limit sharing | App-only signing keys are provisioned only to the backend by the designated custodian. A shared provider secret is limited to its two protocol participants: the backend and that provider. A private key is used by one authorized backend service identity; the provider receives its public key, not a copy of the private key. Do not distribute keys to other developers, devices, frontend bundles, chat, email, screenshots, source control, or tickets. Custodian access is privileged provisioning access and must be listed and reviewed; it is not permission for additional consumers. Use separate credentials for another instance or environment. |
| Store and activate | Use ignored `backend/.secrets/` files and backend-only read-only secret mounts. Keep directory mode `0700` and files `0600`. Provision the Google JSON under ignored `backend/.secret/` with equivalent owner-only host permissions and a read-only backend mount. Check readiness without printing secret contents. Remove imported secret assignments from `.env` after provisioning. |
| Use | Use keys only for their assigned operations and data classes in the inventory. Never expose them to application responses/logs or reuse them for new protocols. Application signing secrets should be separate. The implemented CSRF fallback is an explicit local compatibility exception: `CSRF_SECRET`, then `COOKIE_SECRET`, then `JWT_SECRET`; record the selected source and prefer a separate `CSRF_SECRET`. |
| Review and rotate | Review active credentials/access and this inventory monthly, before an assessed release, and after any cryptographic change. Set a maximum 90-day active period for locally managed signing keys and service-account private keys; use a shorter provider expiry/required rotation period where applicable. Review provider tokens at least every 90 days and rotate where supported. Rotate immediately after suspected disclosure, unauthorized access, a change of custodian/access, or a relevant algorithm/provider compromise. Track deadlines manually; the application does not enforce them automatically. |
| Deactivate and replace | Generate/obtain a replacement, update the secret file/provider configuration, recreate the backend, verify the affected operation, then revoke the old provider credential. JWT key/algorithm changes invalidate earlier sessions; CSRF key changes require new tokens. For a suspected compromise, disable/revoke the old credential immediately rather than waiting for a graceful transition. Restart cached Google clients after replacing their credential JSON. |
| Recover or roll back | Prefer issuing a new credential over recovering an old secret. A rollback must not reactivate a compromised, expired, or retired key/algorithm. If an operational backup is required, encrypt it separately and restrict it to the same custodian; record its location/retention without storing its encryption key alongside it. This review has not verified disk or backup encryption. |
| Destroy | Revoke provider-side credentials, remove obsolete host files, exported `.env` values and container mounts, recreate affected containers, and expire/remove authorized backup copies under their retention policy. Retain nonsecret event metadata only. File deletion alone is not evidence of secure erasure on SSDs or snapshots. |

The custodian must maintain a **private operational register**, outside committed
source, with one record per actual key/credential generation. Record: inventory ID,
provider key ID or locally assigned version ID, custodian/access list, state
(`pre-active`, `active`, `deactivated`, `compromised`, or `destroyed`), creation and
activation dates, expiry/rotation deadline, last review, replacement/revocation
date, backup locations if any, and verification result. Do not record secret
values or private-key material. Public certificates additionally need their
issuer, subject/SANs, serial/fingerprint and validity period.

For a suspected disclosure: disable the affected integration if necessary,
revoke/replace the key, remove unauthorized access, invalidate affected sessions,
verify the replacement, and record the incident without copying the exposed
secret. Follow the concrete recreation steps under [Secret storage and rotation](../README.md#secret-storage-and-rotation).
No live credentials were changed as part of documenting this policy.

## ASVS — cryptographic inventory

Source/configuration inventory reviewed 2026-11-22. Maintainer: project maintainer;
custodian: local operator. Update this table and the private operational register
in the same change whenever a key, algorithm, certificate, integration, or trust
store is added, removed, or changed. Perform the monthly policy review even when
there is no code change. This table records asset classes and usage boundaries;
the private register records individual live instances and their lifecycle.

| Asset / location | Algorithm or credential type; permitted consumer and data | Prohibited use |
| --- | --- | --- |
| `JWT_SECRET` / `backend/.secrets/jwt_secret` | Symmetric session signing key; `jsonwebtoken`, current HS256 (HS384/HS512 selectable). Backend signs/verifies TORRENT session claims. Optional CSRF fallback only as documented above. | No Google-token signing/verification, provider webhooks, password storage, file encryption, or frontend distribution. A signed JWT provides integrity, not confidential storage. |
| `CSRF_SECRET` / `backend/.secrets/csrf_secret` | Symmetric HMAC-SHA256 key used by backend `csrf-csrf` for browser/session-bound CSRF token integrity. | No session signing, provider authentication, password/file encryption, or other applications. |
| `COOKIE_SECRET` / `backend/.secrets/cookie_secret` | Optional backend CSRF HMAC-SHA256 fallback if `CSRF_SECRET` is absent. The current `cookieParser()` does not use it for cookie signing/encryption. | No claim that it encrypts cookies; no provider authentication or new purpose beyond the recorded CSRF fallback. |
| `LINE_CHANNEL_SECRET` / `backend/.secrets/line_channel_secret` | Provider-issued shared secret; LINE and backend, HMAC-SHA256 over original webhook bytes. | No outgoing LINE API authorization, session signing, encryption, or frontend access. |
| `LINE_CHANNEL_ACCESS_TOKEN` / `backend/.secrets/line_channel_access_token` | Provider-issued bearer credential; backend authenticates LINE API requests to LINE. Not an application encryption key. | No webhook MAC verification, other APIs, user sessions, or frontend access. |
| `DATA_GO_API_KEY` / `backend/.secrets/data_go_api_key` | Provider-issued API credential; backend authenticates procurement requests to the configured data.go API. | No other provider, session, webhook, or encryption purpose; never log credential-bearing request URLs. |
| `RESEND_API_KEY` / `backend/.secrets/resend_api_key` | Provider-issued API credential; backend authenticates outgoing alert-email requests to Resend. | No user registration/login, other providers, message encryption, or frontend access. |
| `backend/.secrets/mongo_uri` / mounted `MONGO_URI_FILE` | Connection configuration, potentially containing a database password; backend and MongoDB Atlas. Password verifier/algorithm is managed by MongoDB, not this application. SRV connections enable TLS by default; see [MongoDB TLS](https://www.mongodb.com/docs/drivers/node/current/security/tls/). | No reuse of a database password for signing/provider accounts; do not disable database TLS or certificate validation. |
| Google service-account JSON / `backend/.secret/vertex-sa.json`, selected by `GOOGLE_APPLICATION_CREDENTIALS` | Provider-managed asymmetric private key/credential used by the backend Google SDK for Vertex AI authentication. Actual key ID, type/size, permissions and expiry must be recorded privately; this review did not inspect private material. | No frontend copy, shared developer private key, TORRENT session signing, unrelated Google projects, or direct application-data encryption. |
| Google ID-token public signing keys / Google auth library's provider certificate retrieval/cache | Google-managed public verification material, consumed by backend `OAuth2Client.verifyIdToken`; only Google login claims with the configured audience, issuer and transaction nonce. Google rotates these keys. | No verification of TORRENT sessions with Google keys; never trust a token-supplied arbitrary key URL or use public keys as symmetric secrets. |
| `GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Public OAuth audience/application identifiers, used by backend and browser. They are not cryptographic secrets or signing keys. | No use as a password, HMAC/encryption key, or evidence of possession of a Google private key. |
| e-GP `RDCrypto` passphrase; transient derived key/IV in `smeAnnouncement.js` | Public protocol constant; `evp_bytestokey` 1.0.3 legacy MD5 derivation, 256-bit AES-CBC key, 16-byte IV, eight-byte random salt. Backend encodes/decodes public procurement project IDs for e-GP links. | No passwords, tokens, private user data, application secrets, or new encrypted-storage format. This is external format compatibility, not a confidential application key. |
| Email recipient digests / alert ledger `recipientHashAlgorithm` | Unkeyed SHA-256 default, SHA-384/512 selectable, truncated to 16 hex characters for provider idempotency IDs. New alerts pin the algorithm; existing/legacy retries retain their original selection. | No password hashing, authentication, encryption, or assertion that an email digest anonymizes a recipient. |
| Browser/OS random generators and temporary values | Browser `crypto.getRandomValues` for OIDC nonces, browser/runtime `randomUUID` for CSP/session/lease identifiers, Node `randomBytes` for CSRF identities, LINE link codes, salts and temporary IDs. These are transient values, not long-lived keys. | No reuse of a nonce/salt as a signing key; no use of visual `Math.random()`/`hash01()` helpers for security. Entropy and sampling are separate assessment items. |
| Outbound HTTPS certificate chains and trust anchors / Node/OpenSSL and client-library defaults | Provider-managed server certificates and runtime-managed CA trust for Google, LINE, Resend and procurement endpoints using HTTPS. Actual issuers/expiry vary by endpoint; no application CA override or validation bypass was found in reviewed source. | No arbitrary self-signed trust or disabled certificate validation. Some source code still permits an RSS HTTP fallback; listing HTTPS trust does not establish all-connectivity TLS compliance. |
| Application-owned inbound/internal TLS certificate, private key or local CA | No such asset is configured in the reviewed tracked Compose/server configuration. Local frontend/API use HTTP; MongoDB Atlas uses a separate TLS connection. Any retained certificates from ad hoc local TLS experiments must be registered by the operator with issuer, trust scope, expiry and key owner before being treated as assessed assets. | Do not describe an undocumented local test as a deployed/publicly trusted certificate or a complete certificate inventory. |

**Maintenance evidence and limits:** this review covered tracked source/config,
the secret-name registry, Compose mounts, library metadata and existing tests;
it did not read secret values or audit provider-console access. Human sharing,
actual generation dates/key sizes, external/local test certificate instances,
rotation history, and destruction/backup records still require the custodian's
operational register and access review. The policy and inventory documentation
are now present; an assessment must verify that the live setup follows them
before recording an unconditional operational pass.

