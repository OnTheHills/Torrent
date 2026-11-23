# TORRENT

TORRENT is a web application for discovering, monitoring, and matching Thai public-sector Terms of Reference (TOR) opportunities. The repository currently contains a Next.js frontend, an Express/Mongoose REST API, and MongoDB Atlas persistence. The frontend also includes mock TOR data and a server-side source-health probe for public procurement feeds and agency pages.

## Project structure

```text
.
├── frontend/          Next.js 16 + React 19 + TypeScript UI
├── backend/           Express 5 REST API + Mongoose models
├── docker-compose.yml Frontend/backend stack connected to MongoDB Atlas
├── docs/              Project documentation and deployment notes
└── graphify-out/      Generated project knowledge graph
```

For a guided explanation of the frontend, backend, data flow, and each source
area, see [the codebase guide](docs/codebase-guide.md).

The development services are:

| Service | Local URL / port | Purpose |
| --- | --- | --- |
| Frontend | http://localhost:3000 | Next.js application |
| Backend | http://localhost:5175 | Express REST API |
| MongoDB Atlas | `cluster0.nsacwyj.mongodb.net` | Hosted `Torrent` database |

> The current frontend primarily renders its own mock data. The Express API runs separately and exposes CRUD endpoints; it is not yet the source for every frontend screen.

## Installation with Docker Compose

### Prerequisites

Install Docker Desktop, or Docker Engine with Docker Compose v2.24 or newer,
and make sure Docker is running. The commands below use a macOS/Linux shell
(or WSL). Node.js, npm, and MongoDB do not need to be installed on the host.

### 1. Clone and create the environment files

```bash
git clone https://github.com/OnTheHills/Torrent.git
cd Torrent
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Configure the environment

Edit `backend/.env` before creating the secrets:

- Keep `PORT=5175`. Store the complete Atlas URI in
  `backend/.secrets/mongo_uri` as a single line, without an env assignment or quotes:

  ```text
  mongodb+srv://sandeenakrub_db_user:<db_password>@cluster0.nsacwyj.mongodb.net/Torrent?retryWrites=true&w=majority&appName=Torrent
  ```

  Create `backend/.secrets/` if needed. Replace `<db_password>` with the database
  user's URL-encoded password (`@` becomes `%40`). Keep the real URI private.
  The backend and every maintenance script read this file automatically on the
  host; Docker mounts the same file at `/run/secrets/mongo_uri`.
  Do not put `MONGO_URI` or `MONGO_URI_HOST` in `.env`: they are ignored.
- In Atlas, allow the backend's public outbound IP under **Network Access** and
  give the database user read/write access to `Torrent`. See
  [Atlas connection setup](https://www.mongodb.com/docs/atlas/driver-connection/).
  Changing the connection does not copy records from another database.
- Replace the `JWT_SECRET` placeholder with a long random value. Generate one
  with Docker, then copy its output into `JWT_SECRET`:

  ```bash
  docker run --rm node:22-alpine node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
  ```

- Fill in optional API keys and integration secrets only for services you use;
  leave unused optional secrets blank. These values are temporary setup inputs:
  remove them from `.env` after the secret files are created in step 3.
- Set `GOOGLE_CLIENT_ID` in `backend/.env` and
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env` to the same Google OAuth web
  client ID for Google sign-in. A client ID is public; never put a client secret
  or other private values in `NEXT_PUBLIC_*` variables.
- Keep `NEXT_PUBLIC_API_URL=http://localhost:5175/api` in `frontend/.env`.
- For Vertex AI, place your service-account JSON at
  `backend/.secret/vertex-sa.json` and configure the ordinary Vertex settings
  in `backend/.env`. The credentials directory is mounted read-only.

Never commit `.env`, `.secrets/`, or service-account credentials. No real secret
values belong in this README or the committed `.env.example` files.

### 3. Create Docker secrets, then remove secret entries from `.env`

From the repository root, enter `backend/` and run:

```bash
cd backend
../process.sh secrets
```

This command builds and runs the Docker Compose `secrets-init` helper, reads
`backend/.env`, and creates the other secret files in `backend/.secrets/`.
It validates and preserves the Atlas URI already in `mongo_uri`; it never imports
a database URI from `.env`. Wait for it to finish successfully before proceeding.

**After the secrets are created, comment out or delete the seven secret
assignments from `backend/.env`, including blank optional ones:**

- `JWT_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `COOKIE_SECRET`
- `DATA_GO_API_KEY`
- `CSRF_SECRET`
- `RESEND_API_KEY`

Keep ordinary settings such as `PORT`, `GOOGLE_CLIENT_ID`, `CORS_ORIGIN`, and
feature flags active. Do not delete the files in `.secrets/`. Setup preserves
existing secret files when their assignments are omitted or commented out;
an active blank optional assignment would overwrite its file with an empty value.
Compose supplies the `*_FILE` paths automatically.

### 4. Build and start the stack

Still in `backend/`, return to the repository root and start everything:

```bash
cd ..
./process.sh
```

This prepares secrets again, preserving the files created in step 3, then
builds and starts the complete stack in the background. Compose will:

1. build the frontend and backend Node 22 images;
2. install each app's npm dependencies during the image build;
3. connect the backend directly to Atlas; and
4. expose the frontend on port 3000 and the backend on port 5175.

MongoDB runs in Atlas. Compose contains no MongoDB container, image, local
port, or database volume. Historical Docker volumes are not deleted by this
configuration change.
Open http://localhost:3000. Set `FRONTEND_PORT` in your shell if you want to use a different host port. Verify the backend and follow startup logs with:

```bash
curl http://localhost:5175/api/hello
docker compose logs -f
```

### Optional integration settings

Set `FETCH_ON_STARTUP` in `backend/.env` to `true` to run the e-GP pipeline
when the backend starts. It finds tech project IDs through data.go, verifies
project details and budgets with process5, resolves public e-GP document ZIPs,
and extracts TOR details and bid deadlines from the PDFs. Configure
`backend/.secrets/data_go_api_key`; `EGP_MAX_PROJECTS_PER_SYNC` limits new
project lookups per run (default 20). The sync response reports
`process5Resolved`, `documentLinks`, `ocrUpdated`, and per-project errors.
Run `POST /api/sync/data-go-process5` to trigger one batch manually. Projects
without a downloadable TOR remain `discovered` and are not matched. Set
`FETCH_ON_STARTUP=false` to skip the initial fetch. Both settings keep the
daily sync at **00:00 Asia/Bangkok**, regardless of the container timezone.
The older process3 RSS path remains available through
`POST /api/sync/process3-process5` for manual comparison.

Smart Alert email is enabled when `backend/.secrets/resend_api_key` contains
your Resend API key and `EMAIL_FROM` is set in `backend/.env`. Verify a sending
domain in Resend and use an address on it.
Set `FRONTEND_URL` to the site origin for links in messages. Vendors opt in
by saving email preferences in `/app/alerts`; the worker checks for new matches,
TORs closing within three days, and integrity warnings every ten minutes. It
sends only matched TORs within the saved budget and category range. Existing
matches are not emailed when a user first opts in. Delivery needs a verified
user email address.
Apply changed secrets or settings with `./process.sh up backend`.
An initial fetch failure is logged and the backend still starts with the nightly
schedule enabled.

### Secret storage and rotation

After initial setup, keep real values in the ignored `backend/.secrets/`
files and remove or comment out their assignments in `backend/.env`.
Setup enforces directory mode `0700` and file mode `0600`. The files on the host
use lowercase names, for example `JWT_SECRET` is stored in
`backend/.secrets/jwt_secret`; Compose mounts them at the paths below.

| Input setting | Backend secret file |
| --- | --- |
| `JWT_SECRET` | `/run/secrets/jwt_secret` |
| `backend/.secrets/mongo_uri` (managed directly) | `/run/secrets/mongo_uri` |
| `LINE_CHANNEL_ACCESS_TOKEN` | `/run/secrets/line_channel_access_token` |
| `LINE_CHANNEL_SECRET` | `/run/secrets/line_channel_secret` |
| `COOKIE_SECRET` | `/run/secrets/cookie_secret` |
| `DATA_GO_API_KEY` | `/run/secrets/data_go_api_key` |
| `CSRF_SECRET` | `/run/secrets/csrf_secret` |
| `RESEND_API_KEY` | `/run/secrets/resend_api_key` |

The `jwt_secret` and `mongo_uri` files must be nonempty. The latter must contain
a complete Atlas `mongodb+srv://` URI; placeholders and local URIs are rejected.
Blank integration
secret files retain the existing disabled/unconfigured behavior. Set the LINE
token and signing secret files together when enabling LINE. A blank
`csrf_secret` uses `cookie_secret`, then `jwt_secret`. Use a separate long
random value for each signing secret, such as `openssl rand -base64 32`.

To rotate a secret, update its host file and keep its assignment absent or
commented out in `backend/.env`. To disable an optional integration, empty its
secret file. The setup script imports active assignments from `.env` during initial setup;
remove or comment out those assignments after successful secret creation.
An active blank optional assignment clears its file; required secrets cannot be
blank.

Ordinary settings such as `PORT`, `CORS_ORIGIN`, and feature flags stay active
in `backend/.env` and are loaded through Compose's `env_file`. Setup creates
only individual secret files, with no second env file. Only the backend receives
the secret mounts. In Docker, `SECRETS_ONLY=true` requires file paths and
forbids falling back to raw env values.

After any env change, regenerate and recreate the backend:

```bash
./process.sh up backend
```

Recreation applies changed env settings and any replaced secret files. Compose
secrets are file bind mounts; setup replaces updated files atomically while
preserving omitted files. Changing the JWT secret invalidates existing
sessions; changing the CSRF/cookie secret requires clients to fetch new tokens.
The backend and maintenance scripts use `/run/secrets/mongo_uri` in Docker
and `backend/.secrets/mongo_uri` automatically on the host. They never read a raw
`MONGO_URI` or `MONGO_URI_HOST`, and setup never overwrites the URI file from env
values. After editing the Atlas URI file, recreate the backend with the command
above. For host npm after removing signing inputs from `.env`, set
`JWT_SECRET_FILE=.secrets/jwt_secret` in `backend/.env`.

Compose secrets keep these values out of the container environment and images,
but their host files remain plaintext. Protect them on the host. This workflow
uses Compose file-backed secrets, not `docker secret create`; Docker's encrypted secret store requires Swarm services. See
[Docker's Compose secrets documentation](https://docs.docker.com/compose/how-tos/use-secrets/)
and [Swarm secrets documentation](https://docs.docker.com/engine/swarm/secrets/).

Stop the application stack (Atlas data is unaffected):

```bash
docker compose down
```

### Create the first admin

Admins sign in with Google like everyone else; there is no admin password or
login shortcut. On a fresh database, sign in once with the Google account that
should be the admin, then promote it from the server:

```bash
docker compose exec backend npm run promote-admin -- you@example.com
```

The change is recorded in the audit log. After that, admins can grant or remove
the admin role for other users from **Admin → Users**.

## Dependency workflow

### Bare-metal npm workflow

Install a runtime package in the relevant application directory:

```bash
cd frontend                    # or: cd backend
npm install package-name
```

Install a development-only package:

```bash
npm install --save-dev package-name
```

Commit both `package.json` and `package-lock.json` after intentional dependency changes.

### Docker development workflow

The source directories are bind-mounted into the containers, while each container keeps its own `/app/node_modules` volume. Install a package inside the relevant running container so the container's modules and the host lockfiles stay in sync:

```bash
docker compose exec frontend npm install package-name
docker compose exec backend npm install package-name
```

For development-only packages, append `--save-dev`. After changing dependency files, a clean rebuild is the most reliable way to reproduce the installation:

```bash
docker compose down
docker compose build --no-cache frontend backend
docker compose up
```

## Useful commands

| Command | Run from | Purpose |
| --- | --- | --- |
| `npm run dev` | `frontend/` | Start Next.js with hot reload on all interfaces |
| `npm run build` | `frontend/` | Create a production frontend build |
| `npm run start` | `frontend/` | Serve an existing production build |
| `npm run lint` | `frontend/` | Run ESLint |
| `npm run dev` | `backend/` | Start Express with nodemon reload |
| `./process.sh secrets` | repository root | Create/update Compose secrets from `backend/.env`, preserving omitted values |
| `./process.sh` | repository root | Regenerate secrets and rebuild/recreate the complete Docker stack |
| `./process.sh up backend` | repository root | Regenerate secrets and rebuild/recreate the backend |
| `npm run start` | `backend/` | Start Express without nodemon |
| `npm run probe` | `backend/` | Probe configured public procurement sources |
| `docker compose ps` | repository root | Show container and health status |
| `docker compose logs -f backend` | repository root | Follow backend logs |
| `docker compose restart frontend` | repository root | Restart one service |

## Backend API

The backend provides JSON CRUD routes for:

- `/api/users`
- `/api/vendor-profiles`
- `/api/tors`
- `/api/tor-matches`

Each collection supports `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, and `DELETE /:id`. Basic checks are available at `/` and `/api/hello`.

### Session and CSRF protection

POST, PUT, PATCH, and DELETE require a valid `torrent_session` JWT, except Google
login (which verifies a Google credential) and LINE webhooks (which verify an HMAC).
Existing private GET routes retain their authentication and role/owner checks;
public GET routes remain public.

Browser writes, including Google login and multipart uploads, additionally require
an exact allowed `Origin` from `CORS_ORIGIN` and a signed double-submit CSRF token:

1. Fetch `GET /api/auth/csrf` with cookies enabled and `cache: "no-store"`.
2. Keep the returned `csrfToken` in memory and include it in `x-csrf-token` on writes.
3. Send cookies with `credentials: "include"`. The server validates both the CSRF
   cookie and header, binding the token to the current JWT or a random browser
   identifier before login. Missing/invalid CSRF tokens and untrusted/missing
   origins return `403` before body parsing and route handlers.

The shared frontend `api()` helper performs these steps for JSON and FormData,
clears its cached token after login/logout, and retries a specifically identified
stale-CSRF rejection once. It does not retry permission/origin errors. GET requests
do not fetch CSRF tokens. LINE webhooks alone bypass the browser Origin/CSRF policy
and continue to require their valid `x-line-signature`.

CSRF cookies are HttpOnly and SameSite=Lax. HTTPS (`COOKIE_SECURE=true`) or production
mode uses Secure, host-only `__Host-` cookies; local HTTP uses unprefixed cookies.
Set `CSRF_SECRET` to a private random value to use a separate HMAC key; otherwise
`COOKIE_SECRET`, then `JWT_SECRET`, supplies the key. There is no hardcoded default.
Secret values must stay in deployment configuration, never frontend code or docs.

Command-line writes must also send an allowed Origin, the cookie jar, and the
`x-csrf-token` obtained from the token endpoint. See
[Open API.md](<x-docs/project_details/Open API.md>) for examples and error codes.

Run backend protection tests with
`cd backend && node --require module-alias/register --test tests/auth/mutationAuth.test.js`.
Run frontend request tests with `cd frontend && node --test tests/csrf-api.test.mjs`.
The backend protection tests stub controllers and do not access development data
or external providers.

### Vendor profile certificates

Saving `/app/profile` submits profile details and selected certificate images together.
The vendor profile stores only relative image paths in three string arrays:
`securityCertificates`, `aiCertificates`, and `otherCertificates` (empty by default).
Files are stored locally in `backend/upload/` as
`<unix-time-in-milliseconds>_<security|ai|other>_<user-id>.png`.
The backend creates the upload folder automatically when saving the first image.
The existing Compose backend bind mount preserves these files on the host.
Uploaded files are ignored by Git and excluded from Docker build contexts.

`POST /api/vendor-profiles` and `PATCH /api/vendor-profiles/:id` accept either JSON
for profile-only updates or multipart form data containing a `profile` JSON field
and files under the three array names above. Include existing paths in the JSON
arrays to retain selected images; omitted arrays preserve their existing values.
An empty array removes that category's saved images. New uploads are appended.
Only paths already belonging to the profile can be retained.

Uploads require a signed-in session and profile ownership (or an admin for updates).
Each category accepts up to 5 PNGs, each at most 5 MiB, with dimensions capped at
10,000 pixels per side and 16 megapixels. The server validates the PNG signature,
chunk checksums, and compressed scanline data before writing any images. Failed
database writes clean up new files; removed images are deleted after a successful
save. Images are served through the owner/admin-protected endpoint
`GET /api/vendor-profiles/certificates/:filename`.

Run certificate integration checks with
`cd backend && node --require module-alias/register --test tests/vendor/certificateUploads.test.js`.
The tests use a temporary upload folder and a mocked database. They do not change
development profiles. `CERTIFICATE_UPLOAD_DIR` can override the storage directory
for tests or deployments; database paths retain the `upload/` prefix.

Vendor–TOR matching uses 30 points for the TOR budget compared with team size and
past-project budgets, and 70 points for requirements fit. Within requirements fit,
requirement coverage and relevant past projects are Tier 1, technical skills are
Tier 2, and other relevant profile details are Tier 3. Matching sends the vendor's
registered certificate PNGs to Vertex, checking the filename category and user ID.
Certificate bonuses are capped at 2 points for Security, 2 for AI, and 3 for Other;
these limits allow at most 7 combined points within the overall 10-point bonus
ceiling, and the final match is at most 100.
Other certificates are assessed for TOR relevance first, then the preference order
defined in `backend/src/services/tor/matchWithVertex.js`. The backend calculates
the final percentage from Vertex's component scores and prevents bonuses for
categories with no attached images. Existing matches change on the next matching run.

Matching is queued when an eligible TOR is created or changed, including updates
from the daily midnight Bangkok sync or optional startup sync. Backend restarts
resume unfinished matching jobs. Creating or updating a vendor profile does not
queue matching; its latest details are used when a TOR is next processed.

## Troubleshooting

- **Database secret is missing or invalid:** put the complete Atlas URI in `backend/.secrets/mongo_uri`, then run `./process.sh up backend`.
- **Atlas authentication fails:** replace `<db_password>` with the database user's URL-encoded password, and confirm access to `Torrent`.
- **Atlas connection times out:** check Atlas Network Access for the backend's public outbound IP and confirm the cluster is available.
- **A port is already in use:** stop the process using ports 3000 or 5175, or change the corresponding Compose port mapping.
- **A newly installed package is missing in Docker:** rebuild the affected image, or install it with `docker compose exec` as described above.
- **Source-health results are yellow/red:** those checks call external government websites, so availability and network restrictions can affect the result without breaking the rest of the app.
