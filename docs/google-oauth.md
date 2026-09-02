# Google OAuth — complete implementation guide

Follow this document in order. Do not skip the Atlas or schema steps: the login button will fail even if Google Cloud is perfect.

**Chosen architecture (do not mix with NextAuth):** the Next.js app shows Google’s button, receives a **Google ID token**, and POSTs it to Express. Express verifies the token with Google, upserts a `User`, and sets an **httpOnly JWT cookie**. Vendor pages then require that cookie.

This matches what already exists: Express + Mongoose `User` at `backend/src/models/User.js`, mock login at `frontend/src/app/(auth)/login/page.tsx`.

```mermaid
sequenceDiagram
  participant Browser
  participant Next as Next.js /login
  participant GIS as Google Identity
  participant API as Express :5175
  participant Mongo as MongoDB Atlas

  Browser->>Next: Open /login
  Next->>GIS: Initialize GIS (client ID only)
  Browser->>GIS: Click Continue with Google
  GIS->>Next: credential (JWT ID token)
  Next->>API: POST /api/auth/google { credential }
  API->>GIS: Verify token (google-auth-library)
  API->>Mongo: findOne({ googleId }) or findOne({ email })
  alt new user
    API->>Mongo: insert User role=vendor
  end
  API->>Browser: Set-Cookie torrent_session (httpOnly)
  API->>Next: { user }
  Next->>Browser: redirect /app
```

---

## 0. Definition of done

You are finished when all of these are true:

1. Atlas accepts a connection from your laptop (and from the machine that runs Express).
2. `users` documents can store `googleId`, `picture`, `emailVerified`, and `provider`.
3. `/login` has a working **Continue with Google** button (no password required for Google users).
4. First Google login creates a `User` with `role: "vendor"` and empty `passwordHash`.
5. Second Google login with the same account does **not** create a second user.
6. After login you land on `/app` and a refresh keeps you logged in.
7. `/app` and `/admin` redirect to `/login` when the cookie is missing.
8. Logout clears the cookie and returns to `/login`.
9. `.env` secrets are not in git. `backend/.env.example` lists every new key with dummy values.
10. The Public / Vendor / Admin **view toggle** is hidden when a real session exists (SRS NFR-6).

---

## 1. Current repo state (as of this doc)

Read these files before changing anything.

| Layer | Path | What it does today |
| --- | --- | --- |
| User schema | `backend/src/models/User.js` | `email` unique, optional `passwordHash`, `role`, names. **No Google fields.** |
| User API | `backend/src/routes/userRoute.js` | Open CRUD. Anyone can `GET /api/users`. |
| Server | `backend/src/server.js` | Connects with `MONGO_URI`, mounts routers, no auth middleware. |
| Env sample | `backend/.env.example` | `PORT`, `MONGO_URI` only. |
| Login UI | `frontend/src/app/(auth)/login/page.tsx` | Form `action={/app}` — **no backend.** |
| Register UI | `frontend/src/app/(auth)/register/page.tsx` | Form `action={/app/profile}` — **no backend.** |
| Vendor shell | `frontend/src/app/(vendor)/app/layout.tsx` | No session check. Audience is a client toggle. |
| SRS | `docs/srs.md` US-16, UC-7, FR-21, NFR-6 | Prototype may skip IdP. Production must use real auth + roles. |

**What your friend prepared:** a Mongo-backed `User` collection and Atlas URI. That is the **base table**, not an OAuth schema.

**What is still missing:** Google identity fields, unique index on `googleId`, auth routes, JWT secret, Google Cloud OAuth client, frontend GIS button, route guards.

---

## 2. Work for your friend (database) — do this first

Send them this section as the acceptance list. You should not start the Google button until they reply “indexes created” and you can connect.

### 2.1 Atlas network access

1. Open [MongoDB Atlas](https://cloud.mongodb.com) → your project → **Network Access**.
2. **Add IP Address**.
   - For class/demo on a laptop that changes networks: `0.0.0.0/0` (allow from anywhere) **only if** the DB user password is strong and the cluster is not production-critical.
   - For a locked demo: add your current public IP and the IP of whoever runs Express.
3. Wait until the entry status is **Active**.
4. On your machine, from `backend/` (with `node_modules` installed):

```bash
cd backend
node -e "require('dotenv').config(); const m=require('mongoose'); m.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:8000}).then(()=>{console.log('ok', m.connection.db.databaseName); return m.disconnect();}).catch(e=>{console.error(e.message); process.exit(1);})"
```

Expected: `ok <databaseName>`.  
If you see **IP that isn't whitelisted**, Atlas is not ready. Stop here.

### 2.2 Schema they must add to `User`

Ask them to change `backend/src/models/User.js` to the fields below (or apply this yourself if they only manage Atlas).

Keep existing fields. **Add** the Google ones. Do not make `passwordHash` required.

```js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    username: { type: String, trim: true },
    firstname: { type: String, trim: true },
    lastname: { type: String, trim: true },
    passwordHash: { type: String },
    role: {
      type: String,
      enum: ["vendor", "admin"],
      default: "vendor",
    },
    provider: {
      type: String,
      enum: ["google", "password"],
      default: "google",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    picture: { type: String, trim: true },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("User", userSchema);
```

Why `sparse` on `googleId`: password-only users (if you keep email+password later) will have `googleId: null`. A unique index without `sparse` would allow only one null.

### 2.3 What a Google user document should look like

After first successful login, Compass / Atlas **Browse Collections** → `users` should show something shaped like this (values will differ):

```json
{
  "_id": "ObjectId",
  "email": "name@gmail.com",
  "firstname": "Napat",
  "lastname": "Kulnarong",
  "username": "name",
  "role": "vendor",
  "provider": "google",
  "googleId": "1082… (Google `sub`)",
  "picture": "https://lh3.googleusercontent.com/…",
  "emailVerified": true,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

`passwordHash` should be **absent or null**.

### 2.4 Seed one admin (manual)

Google will not assign `admin`. After you can log in as a vendor, in Atlas edit that user’s `role` to `"admin"`, **or** insert a second user whose `email` matches a Google account you control and set `role: "admin"`.

Document the admin email in a team chat, not in the repo.

### 2.5 Friend checklist (copy back to you)

- [ ] Atlas Network Access includes your IP or `0.0.0.0/0`
- [ ] `User` schema has `googleId` (unique sparse), `provider`, `picture`, `emailVerified`
- [ ] `role` enum is `vendor` | `admin`
- [ ] You ran the `mongoose.connect` one-liner and got `ok`
- [ ] No Google client secret is stored in Mongo (secrets stay in `.env` only)

---

## 3. Google Cloud Console (you)

You need a **Web application** OAuth 2.0 Client ID. The browser only ever sees the **client ID**. The **client secret** is unused in the GIS ID-token flow (keep it in `.env` anyway if Google shows one; do not put it in Next.js `NEXT_PUBLIC_*`).

### 3.1 Create the project and consent screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project (e.g. `torrent-csp`).
3. **APIs & Services → OAuth consent screen**.
   - User type: **External**.
   - App name: `TORRENT`.
   - User support email: your school/Google email.
   - Developer contact: same.
4. Scopes: `openid`, `email`, `profile` (default for GIS).
5. **Test users:** add every Google account that will log in during the demo. While the app is in **Testing**, anyone not on this list gets `403: access_denied`.
6. Do **not** publish to production unless a faculty advisor asks. Testing is enough for the class demo.

### 3.2 Create the OAuth client

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Name: `torrent-web`.
4. **Authorized JavaScript origins** (exact, no trailing slash):

   ```
   http://localhost:3000
   http://localhost:3001
   https://torrent-ten.vercel.app
   ```

   Add every origin you actually use (`next dev` may bind `3001`).

5. **Authorized redirect URIs** (GIS popup/one-tap often only needs origins; add these so a future code flow still works):

   ```
   http://localhost:3000/login
   http://localhost:3001/login
   https://torrent-ten.vercel.app/login
   http://localhost:5175/api/auth/google/callback
   ```

6. Create. Copy **Client ID**. It looks like `xxxx.apps.googleusercontent.com`.

### 3.3 If Google shows “This app isn’t verified”

That is normal in Testing. Test users skip the warning after they accept once. Do not request sensitive scopes.

---

## 4. Environment variables

### 4.1 `backend/.env` (never commit)

Add keys. Keep the existing `MONGO_URI`. Generate the JWT secret:

```bash
openssl rand -base64 32
```

```
PORT=5175
MONGO_URI=<existing Atlas URI>
GOOGLE_CLIENT_ID=<xxxx.apps.googleusercontent.com>
JWT_SECRET=<output of openssl>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
COOKIE_SECURE=false
```

On Vercel / HTTPS later: `COOKIE_SECURE=true` and put the real frontend origin in `CORS_ORIGIN`.

### 4.2 `backend/.env.example`

Replace the file contents with dummy values so teammates know the names:

```
PORT=5175
MONGO_URI="mongodb+srv://USER:PASS@CLUSTER/DB"
GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
JWT_SECRET="replace-with-openssl-rand"
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
COOKIE_SECURE=false
```

### 4.3 `frontend/.env.local` (never commit)

```
NEXT_PUBLIC_API_URL=http://localhost:5175
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same client ID as backend>
```

Only `NEXT_PUBLIC_*` is visible in the browser. That is why the **secret** must never use that prefix.

### 4.4 CORS and cookies

Express must:

- `app.use(cors({ origin: <list from CORS_ORIGIN>, credentials: true }))`
- Cookie flags: `httpOnly: true`, `sameSite: "lax"`, `secure: process.env.COOKIE_SECURE === "true"`, `path: "/"`.

The Next.js `fetch` to Express must use `credentials: "include"`.

If you forget `credentials`, the cookie is set but the browser will not send it on the next request.

---

## 5. Backend implementation

Work in `backend/`. Install:

```bash
cd backend
npm install google-auth-library jsonwebtoken cookie-parser
```

`google-auth-library` verifies the ID token. `jsonwebtoken` signs your session. `cookie-parser` reads the cookie on later requests.

### 5.1 Files to add

| File | Responsibility |
| --- | --- |
| `backend/src/lib/google.js` | `verifyGoogleIdToken(credential)` → `{ googleId, email, firstname, lastname, picture, emailVerified }` |
| `backend/src/lib/session.js` | `signUserToken(user)`, cookie name `torrent_session`, cookie options |
| `backend/src/middleware/requireAuth.js` | Read cookie → verify JWT → `request.user` or `401` |
| `backend/src/middleware/requireRole.js` | `requireRole("admin")` → `403` if `request.user.role` does not match |
| `backend/src/controllers/authController.js` | `googleLogin`, `me`, `logout` |
| `backend/src/routes/authRoute.js` | `POST /google`, `GET /me`, `POST /logout` |

### 5.2 Verify the Google token (exact rules)

In `google.js`:

1. `const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)`.
2. `const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })`.
3. `const p = ticket.getPayload()`.
4. Reject if `p.email` is missing.
5. Map:
   - `googleId` ← `p.sub` (stable Google user id — **not** email)
   - `email` ← `p.email` lowercase
   - `firstname` ← `p.given_name`
   - `lastname` ← `p.family_name`
   - `picture` ← `p.picture`
   - `emailVerified` ← `p.email_verified`

Never trust `email` from the browser body. Only trust the verified token.

### 5.3 Upsert logic (`googleLogin`)

Order matters. Use this exact sequence:

1. Verify token. If invalid → `401` `{ message: "Invalid Google credential." }`.
2. `User.findOne({ googleId })`.
   - If found → update `picture`, `firstname`, `lastname`, `emailVerified`, `email` if Google changed it (rare). Go to step 5.
3. Else `User.findOne({ email })`.
   - If found **without** `googleId` → **link**: set `googleId`, `provider: "google"`, names, picture. This is how a friend-seeded admin email becomes Google-loginable.
   - If found **with a different** `googleId` → `409` (should not happen).
4. Else `User.create({ email, googleId, provider: "google", role: "vendor", firstname, lastname, picture, emailVerified, username: email.split("@")[0] })`.
5. Sign JWT payload `{ sub: user._id.toString(), role: user.role, email: user.email }` with `JWT_SECRET`, expiry `JWT_EXPIRES_IN`.
6. `response.cookie("torrent_session", token, cookieOptions)`.
7. `200` JSON user **without** `passwordHash`.

### 5.4 Routes to mount in `server.js`

```js
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/authRoute");

app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  })
);
app.use("/api/auth", authRouter);
```

Route table:

| Method | Path | Auth | Body / result |
| --- | --- | --- | --- |
| `POST` | `/api/auth/google` | public | `{ credential }` → set cookie + user |
| `GET` | `/api/auth/me` | cookie | current user or `401` |
| `POST` | `/api/auth/logout` | cookie optional | clear cookie |

### 5.5 Lock down user CRUD

Today `GET /api/users` is public. After auth exists:

- `GET /` and `POST /` → `requireAuth` + `requireRole("admin")`
- `GET /:id`, `PATCH /:id` → `requireAuth`, and allow if `request.user.sub === id` **or** role is admin
- `DELETE /:id` → admin only

Do this in the same PR as OAuth so the demo cannot list every user.

### 5.6 JWT payload and cookie

Cookie name: `torrent_session`.  
JWT claims: `sub` (Mongo `_id`), `role`, `email`, `iat`, `exp`.  
Do not put `picture` in the JWT (URL can be long). Read it from `GET /api/auth/me`.

---

## 6. Frontend implementation

### 6.1 Load Google Identity Services

In `frontend/src/app/layout.tsx` `<head>`, add:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### 6.2 Small client helper

Add `frontend/src/lib/api.ts`:

- `API_URL = process.env.NEXT_PUBLIC_API_URL`
- `api(path, options)` → `fetch(`${API_URL}${path}`, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ... } })`

Add `frontend/src/lib/auth.ts`:

- `googleLogin(credential)` → `POST /api/auth/google`
- `getMe()` → `GET /api/auth/me`
- `logout()` → `POST /api/auth/logout`

### 6.3 Google button component

Add `frontend/src/components/auth/google-button.tsx` (`"use client"`):

1. On mount, wait until `window.google` exists (poll 50ms, max ~5s).
2. `google.accounts.id.initialize({ client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, callback })`.
3. `google.accounts.id.renderButton(ref, { theme: "outline", size: "large", width: 320, text: "continue_with" })`.
4. In `callback`, `await googleLogin(response.credential)`, then `router.push(routes.app.home)` (or `routes.app.profile` if `user` has no `VendorProfile` yet — see §7).
5. Show an error string if `GOOGLE_CLIENT_ID` is missing or Google returns `popup_closed`.

Do **not** put the client secret in this file.

### 6.4 Login page

Edit `frontend/src/app/(auth)/login/page.tsx`:

- Keep email/password fields **disabled or hidden** for the demo if you are Google-only, **or** leave them with a note “password login not wired”.
- Place `<GoogleButton />` above the form.
- Change the copy: remove “Prototype auth — no backend yet.”

Register page: same Google button. After first Google login, send the user to `/app/profile` to fill company name and capabilities (`VendorProfile`). Registration fields (company, capabilities) belong on the **profile** after OAuth, not before — Google does not send company.

### 6.5 Session provider

Add `frontend/src/components/providers/session-provider.tsx`:

- On mount, `getMe()`.
- Expose `{ user, loading, refresh, logout }`.
- Wrap it in `frontend/src/app/layout.tsx` next to `LocaleProvider`.

### 6.6 Guard vendor and admin layouts

`frontend/src/app/(vendor)/app/layout.tsx` and `frontend/src/app/(admin)/admin/layout.tsx` cannot stay public.

Because they are Server Components today, the simplest class-demo guard is a small client wrapper:

`frontend/src/components/auth/require-session.tsx`:

- If `loading`, show a short “Signing in…” state.
- If no `user`, `router.replace(routes.login)`.
- If `role` required (`admin`) and `user.role !== "admin"`, `router.replace(routes.app.home)`.
- Else render `children`.

Use it inside those layouts. Public routes (`/`, `/monitor`, `/tors`, `/dashboard`) stay open (SRS FR-17).

### 6.7 Hide the demo view toggle when logged in

In `frontend/src/components/layout/app-bar.tsx`, render `ViewToggle` only when `!user` (or only on public pages). Once Google auth works, the toggle must not impersonate admin (NFR-6).

### 6.8 App bar account

Optional but useful: show `user.picture` + email, and a **Log out** control that calls `logout()` then `router.push(routes.login)`.

---

## 7. Vendor profile after first Google login

Google does not create a `VendorProfile`. Matching (US-16) needs company + capabilities.

After `googleLogin`:

1. `GET /api/vendor-profiles` filtered by `userId` (add `GET /api/vendor-profiles/me` with `requireAuth` — do not list all profiles).
2. If none → redirect `/app/profile` and require `companyName` + `techSkills` before `/app/matches` is useful.
3. `POST /api/vendor-profiles` with `userId` from `request.user.sub`, never from the client body.

Until that `GET /me` exists, you may skip the redirect and still call OAuth “done” if the user can open `/app/profile` manually.

---

## 8. Local runbook

Terminal A — backend:

```bash
cd backend
npm install
npm run dev
```

Expect: `Connected to MongoDB` and `Server running on port 5175`.

Terminal B — frontend:

```bash
cd frontend
npm run dev
```

Open the printed origin (`http://localhost:3000` or `:3001`). That origin **must** be in Google **Authorized JavaScript origins**.

### 8.1 Smoke test

1. Open `/login`. Google button renders (not a blank box).
2. Click it. Pick a **test user** account.
3. Network tab: `POST http://localhost:5175/api/auth/google` → `200`. Response has `email`, `googleId` is not required in JSON if you omit it; cookie `torrent_session` appears under the Express host.
4. Atlas → `users` → one new document.
5. Click Google again with the same account → still **one** document; `updatedAt` changes.
6. Open `/app` in the same browser → stays signed in (`GET /api/auth/me` → `200`).
7. Incognito `/app` → redirect `/login`.
8. Logout → cookie gone → `/app` redirects again.

### 8.2 Common failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| Atlas `IP isn't whitelisted` | Friend did not add your IP | §2.1 |
| Google button missing | GIS script not loaded or wrong `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | §6.1, `.env.local`, restart `next dev` |
| `origin_mismatch` / `redirect_uri_mismatch` | localhost port not in Google origins | §3.2, add `:3001` |
| `403 access_denied` | Account not a Test user | Consent screen → Test users |
| `401 Invalid Google credential` | Backend `GOOGLE_CLIENT_ID` ≠ frontend client ID | Same value in both env files |
| Cookie set, `/me` is 401 | `fetch` missing `credentials: "include"` or CORS `credentials` off | §4.4 |
| Two users for one Gmail | Upsert used email incorrectly or `googleId` index missing | §5.3, §2.2 |
| Admin can use `/admin` as vendor | No `requireRole` / no layout guard | §5.5, §6.6 |

---

## 9. Deploy notes (Vercel frontend + wherever Express lives)

1. Add the production origin and `/login` to Google origins / redirect URIs.
2. Set `NEXT_PUBLIC_API_URL` to the public Express URL (`https://…`).
3. Set `CORS_ORIGIN` to the Vercel origin (`https://torrent-ten.vercel.app`).
4. `COOKIE_SECURE=true`. Cookie `sameSite: "none"` **only if** frontend and API are different sites (then you also need `secure: true`). Prefer putting API and web on the same site later.
5. Atlas Network Access must include the **server** IP of Express (Railway / Render / campus VM), not only your laptop.

Vercel cannot hold the Mongo URI for this flow unless you move verify-token into a Next route. This guide keeps verify on Express — so Express must stay online for login to work on the live site.

---

## 10. Security rules (do not skip)

- Never commit `.env` or `.env.local`.
- Never put `JWT_SECRET` or Atlas passwords in `NEXT_PUBLIC_*`.
- Never accept `email` or `role` from the Google button callback body; only from `verifyIdToken`.
- Never let the client send `role: "admin"`.
- Do not log the raw ID token or JWT in `console.log`.
- After OAuth ships, treat the AppBar view toggle as demo-only or remove it.

---

## 11. Suggested task order (you)

Work in this sequence. Check the box in your notes as you go.

1. [ ] Friend finishes §2. You confirm `mongoose.connect` prints `ok`.
2. [ ] Patch `User.js` if they did not (fields + sparse unique `googleId`).
3. [ ] Google Cloud consent screen + client ID (§3).
4. [ ] Env files (§4). Restart both servers after every env change.
5. [ ] Backend libs, auth routes, cookie CORS (§5).
6. [ ] Protect `/api/users` (§5.5).
7. [ ] Frontend `api` + `GoogleButton` + login copy (§6).
8. [ ] Session provider + `/app` and `/admin` guards (§6.5–6.6).
9. [ ] Hide view toggle when `user` exists (§6.7).
10. [ ] Logout in the AppBar (§6.8).
11. [ ] Optional: `GET /api/vendor-profiles/me` + redirect first-timers to `/app/profile` (§7).
12. [ ] Full smoke test (§8.1).
13. [ ] Seed one admin email in Atlas (§2.4) and confirm `/admin` works only for that role.

---

## 12. What you send back to your friend

A short message you can paste:

> Please (1) whitelist my IP on Atlas or allow `0.0.0.0/0` for the demo cluster, (2) add `googleId` (unique sparse), `provider`, `picture`, `emailVerified` to `User`, (3) keep `passwordHash` optional, (4) tell me when `users` indexes exist. I will do Google Cloud + Express `/api/auth/google` + the Next login button. I will not store the Google client secret in Mongo.

---

## 13. Out of scope (do later)

- Password register / bcrypt (schema already allows `passwordHash`).
- NextAuth / Auth.js Mongo adapter (different collections: `accounts`, `sessions`). Do not add these unless you abandon this guide.
- Refresh tokens / Google Calendar scopes.
- Email notifications (FR-22) — Google already verified the address; SMTP is separate.
- Publishing the OAuth app for “any Google user” without a test-user list.
