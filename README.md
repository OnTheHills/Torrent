# TORRENT — CSP Project

TORRENT is a web application for discovering, monitoring, and matching Thai public-sector Terms of Reference (TOR) opportunities. The repository currently contains a Next.js frontend, an Express/Mongoose REST API, and MongoDB persistence. The frontend also includes mock TOR data and a server-side source-health probe for public procurement feeds and agency pages.

## Project structure

```text
.
├── frontend/          Next.js 16 + React 19 + TypeScript UI
├── backend/           Express 5 REST API + Mongoose models
├── docker-compose.yml Frontend, backend, and MongoDB development stack
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
| MongoDB | `localhost:27017` | Local database port |

> The current frontend primarily renders its own mock data. The Express API runs separately and exposes CRUD endpoints; it is not yet the source for every frontend screen.

## Option 1: run locally with npm

### Prerequisites

Install these tools before starting:

- Node.js 22 (the Docker images use Node 22)
- npm (included with Node.js)
- MongoDB 8 locally, **or** Docker if you only want Docker to provide MongoDB

No global npm libraries are required. Each application's dependencies are declared in its own `package.json` and lockfile.

### 1. Configure the backend

From the repository root, create the local environment file:

```bash
cp backend/.env.example backend/.env
```

For a MongoDB server running directly on your computer, set `backend/.env` to:

```dotenv
PORT=5175
MONGO_URI=mongodb://127.0.0.1:27017/csp_project
```

You may use a MongoDB Atlas connection string instead. Do not commit `backend/.env` or credentials.

If MongoDB is not installed locally, start only the Compose database and keep the localhost URI above:

```bash
docker compose up -d mongo
```

### 2. Install dependencies

Run `npm ci` in both applications. It performs a reproducible install from the committed lockfiles:

```bash
cd backend
npm ci

cd ../frontend
npm ci
```

Use `npm install` instead if you intentionally need to update dependencies or lockfiles.

### 3. Start the backend

In terminal 1:

```bash
cd backend
npm run dev
```

The API waits for MongoDB, creates its Mongoose indexes, and then listens at http://localhost:5175. Verify it with:

```bash
curl http://localhost:5175/api/hello
```

### 4. Start the frontend

In terminal 2:

```bash
cd frontend
npm run dev
```

Open http://localhost:3000.

## Option 2: run the complete stack with Docker Compose

Set `FETCH_ON_STARTUP` in `docker-compose.yml` to `"true"` to fetch live
SME-GP and BMA data once whenever the backend starts, before it serves requests.
Set it to `"false"` (the default) to skip that initial fetch. Both settings keep
the daily sync at **02:00 Asia/Bangkok**, regardless of the container timezone.
Apply a changed setting with `docker compose up -d --force-recreate backend`.
An initial fetch failure is logged and the backend still starts with the nightly
schedule enabled. For npm development, set `FETCH_ON_STARTUP` in `backend/.env`.

### Prerequisites

Install Docker Desktop, or Docker Engine with the Docker Compose v2 plugin. Node.js, npm, and MongoDB do **not** need to be installed on the host for this workflow.

### 1. Configure the backend for Compose

Create `backend/.env` if it does not exist:

```bash
cp backend/.env.example backend/.env
```

To use the MongoDB container included in `docker-compose.yml`, set:

```dotenv
PORT=5175
MONGO_URI=mongodb://mongo:27017/csp_project
```

`mongo` is the Compose service name. Do not use `localhost` here: inside the backend container, `localhost` means the backend container itself. An external MongoDB/Atlas URI also works if the container can reach it.

### 2. Build and start everything

From the repository root:

```bash
docker compose up --build
```

Compose will:

1. pull MongoDB 8;
2. build the frontend and backend Node 22 images;
3. install each app's npm dependencies during the image build;
4. wait for MongoDB's health check before starting the backend; and
5. expose the frontend on port 3000 and the backend on port 5175.

Open http://localhost:3000. To run in the background instead, use:

```bash
docker compose up --build -d
docker compose logs -f
```

Stop the stack while preserving database data:

```bash
docker compose down
```

Stop it and delete the MongoDB volume (this permanently removes local Compose data):

```bash
docker compose down -v
```

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
| `npm run start` | `backend/` | Start Express without nodemon |
| `npm run probe` | `backend/` | Probe configured public procurement sources |
| `docker compose ps` | repository root | Show container and health status |
| `docker compose logs -f backend` | repository root | Follow backend logs |
| `docker compose restart frontend` | repository root | Restart one service |

## Backend API

The backend provides JSON CRUD routes for:

- `/api/users`
- `/api/vendor-profiles`
- `/api/user-bios`
- `/api/tors`
- `/api/tor-matches`

Each collection supports `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, and `DELETE /:id`. Basic checks are available at `/` and `/api/hello`.

## Troubleshooting

- **Backend says `MONGO_URI is required`:** create `backend/.env` and set both variables shown above.
- **Docker backend cannot connect to `127.0.0.1:27017`:** use `mongodb://mongo:27017/csp_project` for the Compose workflow.
- **Local backend cannot resolve host `mongo`:** use `mongodb://127.0.0.1:27017/csp_project` for a bare-metal backend.
- **A port is already in use:** stop the process using ports 3000, 5175, or 27017, or change the corresponding Compose port mapping.
- **A newly installed package is missing in Docker:** rebuild the affected image, or install it with `docker compose exec` as described above.
- **Source-health results are yellow/red:** those checks call external government websites, so availability and network restrictions can affect the result without breaking the rest of the app.
