# Commands

Practical command guide for setting up, running, checking, and maintaining TORRENT.
Use Bash/zsh and start from the repository root unless stated otherwise. Replace
example branch names, email addresses, package names, and IDs before running.

Related guides: [project setup](../README.md), [codebase guide](./codebase-guide.md).

## Contents

- [Quick daily workflow](#quick-daily-workflow)
- [First-time setup](#first-time-setup)
- [Run the project](#run-the-project)
- [Docker operations and secrets](#docker-operations-and-secrets)
- [Dependencies](#dependencies)
- [Tests, lint, types, and builds](#tests-lint-types-and-builds)
- [API checks](#api-checks)
- [Google login and the first admin](#google-login-and-the-first-admin)
- [Authenticated API commands](#authenticated-api-commands)
- [Procurement sync and OCR](#procurement-sync-and-ocr)
- [Source and Vertex AI diagnostics](#source-and-vertex-ai-diagnostics)
- [Database inspection and backup](#database-inspection-and-backup)
- [Maintenance scripts](#maintenance-scripts)
- [Git](#git)
- [Deploy frontend to Vercel](#deploy-frontend-to-vercel)
- [Troubleshooting](#troubleshooting)

## Quick daily workflow

Check your branch, start the stack, and follow backend logs:

```bash
git status
git branch --show-current
./process.sh
docker compose ps
docker compose logs --tail=100 -f backend
```

Open http://localhost:3000. `Ctrl+C` stops following logs; background containers
keep running. Stop the stack while keeping its database with:

```bash
docker compose down
```

| Task | Command from repository root |
| --- | --- |
| Build/recreate the complete stack | `./process.sh` |
| Apply backend code, env, or secret changes | `./process.sh up backend` |
| Prepare secrets without restarting | `./process.sh secrets` |
| Check container health | `docker compose ps -a` |
| Run backend tests | `npm --prefix backend test` |
| Run frontend lint | `npm --prefix frontend run lint` |
| Review uncommitted edits | `git diff` |

## First-time setup

Docker builds need Docker Desktop/Engine and Compose v2.24 or newer.
Host npm development also needs Node.js 22 and npm. Use Node 22.18+ for frontend
tests that import TypeScript directly.

```bash
git --version
docker --version
docker compose version
node --version
npm --version
```

Skip Node/npm checks for a Docker-only setup. Create local environment files
**only if they do not already exist**; copying again overwrites local settings:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Generate a signing secret and put the result in `JWT_SECRET` in `backend/.env`:

```bash
openssl rand -base64 32
```

| Setting | Docker backend | Host npm backend |
| --- | --- | --- |
| `backend/.secrets/mongo_uri` | Complete Atlas `mongodb+srv://` URI, with URL-encoded database password | Same file, read automatically |
| `backend/.env`: `PORT` | `5175` | `5175` |
| `backend/.env`: `CORS_ORIGIN` | `http://localhost:3000,http://localhost:3001` | Same |
| `backend/.env`: `COOKIE_SECURE` | `false` for local HTTP | Same |
| `frontend/.env.local`: `NEXT_PUBLIC_API_URL` | `http://localhost:5175/api` | Same |

Set backend `GOOGLE_CLIENT_ID` and frontend `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to the
same Google OAuth web client ID. Register the actual frontend origin, including
its port, in that client's authorized JavaScript origins.

Configure optional data.go, Vertex AI, LINE, and Resend settings using
[backend/.env.example](../backend/.env.example). Keep env files, secret files,
service account JSON, cookies, and tokens private.

## Run the project

| Service | Local address |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5175 |
| MongoDB Atlas | `cluster0.nsacwyj.mongodb.net` (`Torrent` database) |

Choose Docker or host npm for each application; duplicate servers cannot use
the same port.

### Docker

With `backend/.env` configured:

```bash
./process.sh
```

This prepares file-backed secrets, builds images, and recreates services in the
background. The backend uses `backend/.secrets/mongo_uri`, mounted at
`/run/secrets/mongo_uri`. Allow the backend's outbound IP in Atlas Network Access.
There is no local MongoDB service, port, image, or database volume in Compose.

### Host npm with Atlas

Use the same Atlas URI as Docker, then install dependencies from committed lockfiles:

```bash
npm --prefix backend ci
npm --prefix frontend ci
```

The backend reads `backend/.secrets/mongo_uri` automatically. Do not set raw
`MONGO_URI` or `MONGO_URI_HOST`; they are ignored. For host sign-in, configure
`JWT_SECRET` or `JWT_SECRET_FILE=.secrets/jwt_secret` as well.
In terminal 1, starting from the repository root:

```bash
cd backend
npm run dev
```

In terminal 2, starting from the repository root:

```bash
cd frontend
npm run dev
```

`Ctrl+C` stops each dev server. To switch from the full Docker stack to host npm,
first stop the application containers:

```bash
docker compose stop frontend backend
```

## Docker operations and secrets

### Status, logs, and shells

```bash
docker compose ps -a
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
docker compose logs --tail=100 -f
docker compose exec backend sh
docker compose exec frontend sh
```

Use `exit` to leave a shell. `exec` requires a running container and runs commands
from its `/app` directory.

### Restart, recreate, and stop

```bash
# Restart existing containers using their existing configuration.
docker compose restart backend
docker compose restart frontend

# Prepare secrets and rebuild/recreate the selected application.
./process.sh up backend
./process.sh up frontend

# Stop containers without removing them; start them again.
docker compose stop
docker compose start

# Remove containers/network but preserve the named MongoDB volume.
docker compose down
```

Use `./process.sh up backend` after editing `backend/.env`. A restart alone does
not load changed env settings or replaced secret mounts. Restart the frontend
dev server/container after frontend env changes; production `NEXT_PUBLIC_*`
changes require rebuilding the frontend.

### Secret setup and rotation

```bash
./process.sh --help
./process.sh secrets
./process.sh up backend
```

`secrets` writes the seven non-database secret files under `backend/.secrets/`
from `backend/.env`. Create `backend/.secrets/mongo_uri` directly with your full
Atlas URI before setup; it is validated and never overwritten from env inputs.
`jwt_secret` and `mongo_uri` must be nonempty. Database placeholders and local
URIs are rejected. After initial setup, omitted or commented signing/integration
entries preserve existing files; an explicitly blank optional entry clears its
file. Signing-secret changes invalidate sessions or CSRF tokens.

Check secret mounts without printing their contents:

```bash
docker compose exec backend node -e 'require("./src/config/secrets").validateSecrets(); console.log("Secret files are readable")'
```

### Stop the application

```bash
docker compose down
```

This stops the application containers. Atlas database data is unaffected.

## Dependencies

There is no root `package.json`. Install in the application that uses the package:

```bash
# Reproduce committed installations.
npm --prefix backend ci
npm --prefix frontend ci

# Add a runtime dependency; replace package-name.
npm --prefix backend install package-name
npm --prefix frontend install package-name

# Add a development dependency.
npm --prefix frontend install --save-dev package-name
```

Commit the affected `package.json` and `package-lock.json`. `npm ci` replaces
installed modules and requires the manifest and lockfile to agree.

Both application images run production builds with `npm run start`. Source
code is copied into the images; only backend uploads and credentials remain
mounted. Install packages on the host as shown above, then rebuild:

```bash
./process.sh up backend
./process.sh up frontend
```

The backend build uses esbuild and preserves module paths in `dist/`. For host
production use, run `npm run build` before `npm run start` in each app directory.
Host `npm run dev` still supports development reloads.

Compose supplies `frontend/.env` to the frontend build as a temporary BuildKit
secret. Next.js embeds `NEXT_PUBLIC_*` values at build time, so changes to these
public values require `docker compose build --no-cache frontend` before
recreating the frontend: secret contents do not invalidate BuildKit caches.
The env file stays out of the image. Atlas data is independent of image rebuilds.

## Tests, lint, types, and builds

### Host checks

Backend suite and one focused file, from the repository root:

```bash
npm --prefix backend test
npm --prefix backend test -- tests/auth/mutationAuth.test.js
```

Frontend checks, starting from the repository root:

```bash
cd frontend
npm run lint
npx tsc --noEmit
node --test tests/*.test.mjs
npm run build
```

The frontend `npm test` script uses Node's test runner; some
import `.ts` files directly, so use Node 22.18+ (or Node 22 with
`--experimental-strip-types`). Install backend dependencies too: the dashboard
API contract test loads backend modules. CI currently runs frontend ESLint.

A focused frontend check, from `frontend/`:

```bash
node --test tests/csrf-api.test.mjs
```

### Docker checks

Build both production images and check the running applications:

```bash
docker compose build backend frontend
docker compose up -d backend frontend
docker compose ps
docker compose logs --tail=30 backend frontend
curl --fail http://localhost:5175/api/tors
curl --fail --output /dev/null http://localhost:3000/
```

Run backend regression tests on the host with `npm --prefix backend test`.
The production backend image excludes the test suite and development packages.
Run frontend tests on the host with both applications' dependencies installed;
the dashboard API contract test imports backend modules.

### Serve a local production frontend build

Stop the frontend dev server/container, then from `frontend/`:

```bash
npm run build
npm run start
```

`start` requires an existing build and a reachable backend. To check a build
while a dev server stays running, use a separate output directory:

```bash
NEXT_DIST_DIR=.next-build-check npm run build
```

## API checks

These public GET requests need no login:

```bash
curl --fail-with-body http://localhost:5175/
curl --fail-with-body http://localhost:5175/api/tors
curl --fail-with-body http://localhost:5175/api/tors/category-distribution
curl --fail-with-body http://localhost:5175/api/tors/top-departments-by-budget
```

The development-only `/api/hello` diagnostic is disabled in production. `/api/tors` returns an
array. Count visible TORs without printing the whole catalog (requires host Node):

```bash
curl --fail-with-body --silent --show-error http://localhost:5175/api/tors \
  | node -e 'let s=""; process.stdin.on("data", c => s += c); process.stdin.on("end", () => console.log(JSON.parse(s).length))'
```

## Google login and the first admin

Register an account through the app using Google, then promote that existing
account from the server. Replace the email:

```bash
docker compose exec backend npm run promote-admin -- you@example.com
```

Host equivalent, from `backend/`:

```bash
npm run promote-admin -- you@example.com
```

The script uses the same Atlas secret file as the backend: automatically
`backend/.secrets/mongo_uri` on the host, or the mounted secret in Docker.
Raw `MONGO_URI` and `MONGO_URI_HOST` values are ignored.

Promotion also re-enables a disabled account and records an audit event. Refresh
the app after promotion. Admins can manage other roles through **Admin → Users**.

## Authenticated API commands

Prefer the admin UI for routine operations. Protected GET requests need a valid
`torrent_session` cookie. Writes also require an allowed `Origin`, a CSRF cookie,
and its matching `x-csrf-token` header. A bare `curl -X POST` fails.

### Prepare a local admin session

Sign in to the local app as an admin. In browser developer tools, find the
backend's `torrent_session` cookie under Application/Storage → Cookies. In a
private terminal, disable shell tracing, then paste only the cookie value after
`read` and press Enter (input is hidden):

```bash
set +x
read -r -s TORRENT_SESSION
```

Create a private temporary cookie jar and verify the session. These examples
use the local HTTP backend and host Node for JSON parsing:

```bash
TORRENT_API=http://localhost:5175/api
TORRENT_ORIGIN=http://localhost:3000
TORRENT_COOKIE_JAR=$(mktemp)
chmod 600 "$TORRENT_COOKIE_JAR"
printf '# Netscape HTTP Cookie File\nlocalhost\tFALSE\t/\tFALSE\t0\ttorrent_session\t%s\n' "$TORRENT_SESSION" > "$TORRENT_COOKIE_JAR"
unset TORRENT_SESSION

curl --fail-with-body -b "$TORRENT_COOKIE_JAR" -c "$TORRENT_COOKIE_JAR" \
  "$TORRENT_API/auth/me"
```

Only continue if `/auth/me` succeeds for your admin account. Fetch a CSRF token
bound to that session and keep the returned cookies:

```bash
TORRENT_CSRF=$(curl --fail-with-body --silent --show-error \
  -b "$TORRENT_COOKIE_JAR" -c "$TORRENT_COOKIE_JAR" \
  -H "Origin: $TORRENT_ORIGIN" "$TORRENT_API/auth/csrf" \
  | node -e 'let s=""; process.stdin.on("data", c => s += c); process.stdin.on("end", () => { const d=JSON.parse(s); if (!d.csrfToken) process.exit(1); process.stdout.write(d.csrfToken); })')
```

Use the exact allowed frontend origin. Fetch a new CSRF token after login/logout,
session replacement, or secret rotation. Inspect admin state with:

```bash
curl --fail-with-body -b "$TORRENT_COOKIE_JAR" "$TORRENT_API/admin/overview"
curl --fail-with-body -b "$TORRENT_COOKIE_JAR" "$TORRENT_API/admin/sources"
curl --fail-with-body -b "$TORRENT_COOKIE_JAR" "$TORRENT_API/admin/matches"
```

After using the sync commands below, delete the cookie jar and clear variables:

```bash
rm -f "$TORRENT_COOKIE_JAR"
unset TORRENT_API TORRENT_ORIGIN TORRENT_COOKIE_JAR TORRENT_CSRF
```

## Procurement sync and OCR

These operations update records, download public documents, and may use configured
Vertex AI services. Prepare the admin session above first. Run one sync at a time
and inspect its response before starting another.

### Trigger the primary data.go → process5 pipeline

```bash
curl --fail-with-body -X POST \
  -b "$TORRENT_COOKIE_JAR" -c "$TORRENT_COOKIE_JAR" \
  -H "Origin: $TORRENT_ORIGIN" \
  -H "x-csrf-token: $TORRENT_CSRF" \
  "$TORRENT_API/sync/data-go-process5"
```

Configure `DATA_GO_API_KEY` first. `EGP_MAX_PROJECTS_PER_SYNC` controls new project
lookups (default 20). Inspect the response's `data` summary for process5,
document-link, OCR, and error details. HTTP success can still include per-project
errors or discovery rate-limit information.

Use the same POST command with a different path for these operations:

| Path after `$TORRENT_API` | Operation |
| --- | --- |
| `/sync/all` | Current manual batch, primarily `dataGoProcess5` |
| `/sync/process3-process5` | Older process3 discovery → process5 pipeline |
| `/sync/bma-egp2` | BMA e-GP2 import and document enrichment |
| `/sync/egp-rss` | e-GP RSS import |
| `/sync/data-go` | Alternate data.go import |
| `/sync/sme-announcements` | Budgets/links from stored SME-GP announcement PDFs |
| `/sync/ocr` | Document enrichment for stored `EGP-PROCESS5` TORs |
| `/sync/ocr/bma` | PDF enrichment for stored `BMA-EGP2` TORs |

Manual `/sync/all` and automatic sync use different source selections in
`backend/src/jobs/syncAPI.js`. Automatic startup/nightly sync also visits the
alternate sources. BMA sync can remove stored source records absent from its
latest fetched set; back up important data before maintenance imports.

### Startup fetching and schedules

Set `FETCH_ON_STARTUP=true` in `backend/.env`, then apply it:

```bash
./process.sh up backend
docker compose logs --tail=200 -f backend
```

Look for `Connected to MongoDB`, `Server running on port 5175`, and startup sync
results. `FETCH_ON_STARTUP=false` skips startup fetching; daily sync still runs
at **00:00 Asia/Bangkok** while the backend is running. Restarting with startup
fetching enabled triggers another import.

Matching resumes saved jobs at startup. Email alerts check every ten minutes
when configured; the enabled LINE weekly digest runs Monday at 09:00 Bangkok.

## Source and Vertex AI diagnostics

These probes contact external services; the Vertex probe makes a model request
using your configured Google Cloud project.

```bash
# Docker, from repository root.
docker compose exec backend npm run probe
docker compose exec backend npm run probe:vertex
```

Host equivalents, from `backend/`:

```bash
npm run probe
npm run probe:vertex
```

`probe` checks sources listed in `scripts/probe-sources.js`; it does not verify
every pipeline or populate the database. `probe:vertex` reports `configured`,
`ok`, and model output or an error. Check `GOOGLE_CLOUD_PROJECT`,
`VERTEX_LOCATION`, `VERTEX_MODEL`, and `GOOGLE_APPLICATION_CREDENTIALS` if it fails.
The example credentials file is `backend/.secret/vertex-sa.json` on the host,
mounted as `/app/.secret/vertex-sa.json` in Docker.

## Database inspection and backup

MongoDB runs in Atlas, using the URI in `backend/.secrets/mongo_uri`.
The application selects database `Torrent`. Use Atlas Data Explorer to inspect
collections and counts. Use Atlas backup/restore facilities available for your
cluster tier, with operator-managed access and retention. No database tools or
MongoDB server run in the application containers.

Changing the URI does not migrate data from another database. Keep database
credentials out of command arguments, logs, screenshots, and committed files.

## Maintenance scripts

These modify stored data and have no dry-run flag. Back up the target database
first; run them deliberately rather than on every startup.

```bash
# Merge duplicate TORs across supported sources.
docker compose exec backend node scripts/reconcile-tor-merges.js

# Fill budgets and links from stored SME-GP announcement PDFs.
docker compose exec backend node scripts/enrich-sme-announcements.js
```

Host equivalents, from `backend/`:

```bash
node scripts/reconcile-tor-merges.js
node scripts/enrich-sme-announcements.js
```

Like `promote-admin`, host scripts automatically read `backend/.secrets/mongo_uri`.
Docker uses the same file mounted as a secret. Confirm the target first.
Duplicate reconciliation can merge records and related references; SME enrichment
downloads PDFs and updates existing data.

## Git

### Inspect your branch and changes

```bash
git status
git branch -vv
git diff
git diff --staged
git log --oneline --decorate -10
```

### Update main and create a branch

Commit or stash unfinished work before switching if needed:

```bash
git switch main
git pull --ff-only
git switch -c feature/my-work
```

Or create directly from the latest remote main:

```bash
git fetch origin
git switch -c feature/my-work origin/main
```

Switch to an existing local branch with `git switch feature/my-work`.

### Bring main into your feature branch

With your work committed or stashed:

```bash
git fetch origin
git switch feature/my-work
git merge origin/main
```

For conflicts, edit the files, remove conflict markers, then complete the merge:

```bash
git status
git add path/to/resolved-file
git merge --continue
```

To cancel an in-progress merge instead, run `git merge --abort`.

### Save unfinished work temporarily

`-u` includes untracked files but excludes ignored env/secrets files:

```bash
git stash push -u -m "work in progress"
git stash list
git stash pop
```

`pop` can produce conflicts; resolve them before continuing.

### Commit and push

Stage intended files and inspect the result before committing:

```bash
git add x-docs/commands.md
git diff --staged
git commit -m "docs: expand project command guide"
git push -u origin HEAD
```

Replace the file and message for your change. Later pushes on the tracked branch
need only `git push`. Do not stage credentials or database dumps.

### Unstage or discard changes

Unstage a file while keeping its working changes:

```bash
git restore --staged path/to/file
```

**Destructive:** discard unstaged changes only after checking `git diff`:

```bash
git restore path/to/file
```

## Deploy frontend to Vercel

From `frontend/`, check the build, log in, and create a preview:

```bash
npm run build
npx vercel login
npx vercel
```

Check the account/project and preview before publishing local files to production:

```bash
npx vercel --prod
```

The existing guide identifies `wafers-projects / torrent` and
https://torrent-ten.vercel.app; confirm the CLI is linked to the intended project.
These commands upload local files without requiring a GitHub push.

Set the deployed frontend's `NEXT_PUBLIC_API_URL` to a reachable HTTPS backend
and configure `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, backend allowed origins, and cookie
settings for the deployed site. Localhost URLs point at the visitor's computer.
The Express API, MongoDB, credentials, and scheduled workers need a running
backend environment separately from the frontend deployment.

## Troubleshooting

| Symptom | Check / next step |
| --- | --- |
| Docker daemon unavailable | Start Docker Desktop and retry `docker compose ps` |
| Missing/unreadable secret mount | Check `backend/.env`, then `./process.sh up backend` |
| Atlas authentication fails | Check the database user/password and URL-encode special password characters |
| Atlas connection times out | Allow the backend outbound IP in Atlas Network Access; check cluster availability |
| API `401` | Sign in again; check the session cookie |
| `403 INVALID_ORIGIN` | Use an exact origin from `CORS_ORIGIN` |
| `403 INVALID_CSRF_TOKEN` | Fetch a new token using the same cookie jar, then send cookie and header |
| `403 Forbidden.` | Check that the account has the required role |
| Package missing in Docker after dependency change | Rebuild the affected application image as above |
| Google login fails | Match both OAuth client IDs and register the actual frontend origin |

### Port already in use

On macOS, find the process using each port:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:5175 -sTCP:LISTEN
docker compose ps
```

Stop the duplicate server with `Ctrl+C` in its terminal or stop its Compose
service. If Next.js selects port 3001, update Google authorized origins and
ensure the backend allows that exact origin.

### Database connection failures

```bash
docker compose ps -a backend
docker compose logs --tail=100 backend
```

Check that `backend/.secrets/mongo_uri` contains the complete Atlas URI with no
password placeholder. Confirm Atlas Network Access allows the backend's public
outbound IP and that the database user can read/write `Torrent`.
Apply changed secret files or Docker settings with `./process.sh up backend`.

### Empty listings or zero budgets

Check `/api/tors`, backend logs, and database counts. An empty array
means there are no visible stored TORs; a failed request points to a backend or
network problem. Trigger an authenticated sync or enable startup fetching.

If the API has records but the UI is empty, check the frontend API URL and
Docker's server-side `BACKEND_API_URL`. Catalog fetches can show cached data for
60 seconds. A zero budget can mean the source supplied no amount or document
enrichment has not resolved it; it does not by itself indicate an outage.

### Next.js build/cache problems

Avoid sharing an output directory between simultaneous dev and build processes.
Use `NEXT_DIST_DIR=.next-build-check` for an isolated build check. To clear the
default cache, stop the frontend first, then from `frontend/`:

```bash
rm -rf .next
npm run dev
```

This removes generated output, including any production build. To refresh npm
modules in Docker, use the dependency-volume commands above. Atlas storage is independent of these application containers.
