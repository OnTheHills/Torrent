# Commands

Cheat sheet for Git, running the stack, empty listings, and Vercel.

End-to-end Google login (Atlas, schema, Cloud Console, Express, Next.js): [google-oauth.md](./google-oauth.md). Broader setup: [README.md](../README.md).

## Contents

- [Git](#git)
  - [Switch to main](#switch-to-main)
  - [Update local main](#update-local-main)
  - [New branch from local main](#new-branch-from-local-main)
  - [New branch from origin/main](#new-branch-from-originmain)
  - [Switch to an existing branch](#switch-to-an-existing-branch)
  - [See where you are](#see-where-you-are)
  - [Update a feature branch with latest main](#update-a-feature-branch-with-latest-main)
  - [Push a new branch](#push-a-new-branch)
- [Run the project](#run-the-project)
  - [Docker (usual)](#docker-usual)
  - [npm](#npm)
  - [Useful Docker commands](#useful-docker-commands)
- [Empty listings / budgets](#empty-listings--budgets)
- [Setup & auth](#setup--auth)
- [Deploy](#deploy)

## Git

Run these from the repository root. Stash or commit uncommitted work before switching branches if Git refuses.

### Switch to main

```bash
git switch main
```

### Update local main

```bash
git switch main
git pull
```

### New branch from local main

Update main first, then create and switch to a new branch from that commit:

```bash
git switch main
git pull
git switch -c feature/my-work
```

Replace `feature/my-work` with the branch name.

Create the branch from local `main` without switching to `main` first (only if `main` is already up to date):

```bash
git switch -c feature/my-work main
```

### New branch from origin/main

Same result, using the remote tip of `main` without checking `main` out first:

```bash
git fetch origin
git switch -c feature/my-work origin/main
```

### Switch to an existing branch

```bash
git switch feature/my-work
```

### See where you are

```bash
git status
git branch -vv
```

### Update a feature branch with latest main

```bash
git switch main
git pull
git switch feature/my-work
git merge main
```

### Push a new branch

```bash
git push -u origin HEAD
```

## Run the project

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5175 |
| MongoDB | `localhost:27017` |

Do not run host `npm run dev` and Docker on port 5175 at the same time. Do not send `.env` (it has secrets).

### Docker (usual)

From the repository root. `backend/.env` should already exist.

```bash
docker compose up -d
```

First time, or after dependency / Dockerfile changes:

```bash
docker compose up --build -d
```

In `backend/.env`, Compose needs `MONGO_URI=mongodb://mongo:27017/Torrent` (hostname `mongo` only works inside Compose). Compose also forces that URI on the backend container. Set `FETCH_ON_STARTUP=true` if listings should fill on startup.

Follow logs:

```bash
docker compose logs -f backend
```

### npm

In `backend/.env` use `MONGO_URI=mongodb://127.0.0.1:27017/Torrent`. If Mongo is not installed on the host:

```bash
docker compose up -d mongo
```

Frontend env: `NEXT_PUBLIC_API_URL=http://localhost:5175/api` in `frontend/.env.local`.

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Install once if `node_modules` is missing: `npm ci` in `backend/` and `frontend/`.

### Useful Docker commands

```bash
docker compose ps
docker compose logs -f
docker compose logs -f backend
docker compose restart frontend
docker compose down          # stop, keep Mongo data
docker compose down -v       # stop and delete local Mongo volume
```

## Empty listings / budgets

The UI is empty when `GET /api/tors` fails or the DB was never synced.

**Docker**

1. Pull latest.
2. In `backend/.env`: `MONGO_URI=mongodb://mongo:27017/Torrent` and `FETCH_ON_STARTUP=true`.
3. Recreate and wait for sync:

```bash
docker compose up -d --force-recreate backend
docker compose logs -f backend
```

Look for `Server running`, then `FETCH_ON_STARTUP`, then `Procurement sync complete`. Check with `curl http://localhost:5175/api/tors` — should be a JSON array, not empty / connection reset.

**Host `npm run dev`:** use `MONGO_URI=mongodb://127.0.0.1:27017/Torrent`. Do not run host backend and Docker on 5175 at the same time.

**Frontend:** `NEXT_PUBLIC_API_URL=http://localhost:5175/api` in `frontend/.env.local`.

SME-GP rows often have budget `0`; only BMA e-GP2 usually has amounts. That is separate from this outage.

## Setup & auth

### Log in to Vercel CLI

From `frontend/`. Run this if `npx vercel --prod` says `Not authorized`.

```bash
cd frontend
npx vercel login
```

Opens a browser. Use the same Vercel account that owns **wafers-projects / torrent**.

## Deploy

### Deploy frontend to Vercel

From `frontend/`. Uploads local files — no GitHub push.

```bash
cd frontend
npx vercel --prod
```

Updates the live site: https://torrent-ten.vercel.app

Preview only (does not update production):

```bash
cd frontend
npx vercel
```
