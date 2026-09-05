# TORRENT Codebase Guide

This guide is the starting point for reading the project.  It explains the
responsibility of every source area and the data path between them.  Read this
before diving into individual components; names in the code intentionally
match the terms used here.

## The application in one picture

```text
SME-GP API (POST) ─┐
                   ├─ source adapters ─> sync coordinator ─> MongoDB `tors`
BMA e-GP2 API (GET)┘                                  │
                                                        ▼
Browser / Next.js page ─> frontend API adapter ─> Express `/api/tors`
                                                        │
                                                        ▼
                                      Dashboard charts and comparison table
```

Google sign-in uses a parallel path:

```text
Google Identity script -> GoogleButton -> POST /api/auth/google
  -> backend verifies ID token -> signed HTTP-only cookie
  -> SessionProvider GETs /api/auth/me -> React components read the user
```

## Read this project in this order

1. `docker-compose.yml` shows the three runtime services: Next.js frontend,
   Express backend, and MongoDB.
2. `backend/src/server.js` starts the database and sync job; `backend/src/app.js` wires Express middleware and every API router.
3. `backend/src/services/syncService.js` coordinates the two procurement imports.
4. `frontend/src/lib/api.ts` maps database-shaped TORs into the frontend `Tor`
   type.
5. `frontend/src/app/(public)/dashboard/page.tsx` loads those TORs and passes
   them to `components/dashboard/dashboard-view.tsx`.

## Backend

### Startup and request path

| File / folder | Role |
| --- | --- |
| `src/server.js` | Loads environment settings, connects the database, starts the sync job, then listens for requests. |
| `src/app.js` | Creates Express, configures middleware, and mounts `/api/*` routers. |
| `src/utils/connectDatabase.js` | Connects to MongoDB and waits for model indexes before startup continues. |
| `src/routes/*.js` | Declares HTTP method and URL only. Routes hand work to a controller. |
| `src/controllers/*.js` | Converts an HTTP request into a service call and selects the success/error response. |
| `src/services/torService.js` | TOR business boundary. Controllers use it instead of reaching Mongoose directly. |
| `src/repositories/torRepository.js` | Contains MongoDB queries for the `tors` collection. |
| `src/models/*.js` | Mongoose schemas: the persistent shape and validation of each collection. |
| `src/middleware/requireAuth.js` | Requires a valid session cookie and attaches decoded user claims to `request.user`. |
| `src/middleware/requireRole.js` | Builds a middleware check for allowed user roles. |
| `src/utils/googleAuth.js` | Verifies a Google ID token with Google. |
| `src/utils/session.js` | Signs/verifies JWTs and defines the secure cookie attributes. |

### API routers and controllers

| API | Router | Controller responsibility |
| --- | --- | --- |
| `/api/auth` | `authRoute.js` | Google login, current session lookup, logout. |
| `/api/users` | `userRoute.js` | User CRUD. |
| `/api/vendor-profiles` | `vendorProfileRoute.js` | Vendor company/profile CRUD. |
| `/api/user-bios` | `userBioRoute.js` | Public user bio CRUD. |
| `/api/tors` | `torRoute.js` | Read and maintain procurement TORs. |
| `/api/tor-matches` | `torMatchRoute.js` | Persist a vendor-to-TOR match. |
| `/api/sync` | `syncRoute.js` | Starts all-source, SME-GP-only, or BMA e-GP2-only imports. |

Each CRUD controller follows the same shape: read `request.body` or
`request.params`, call its service, return JSON, and turn exceptions into a
500 response.  `torController.js` is the clearest template for that pattern.

### Models

| Model | Mongo collection | What it stores |
| --- | --- | --- |
| `TOR.js` | `tors` | A normalized procurement opportunity from any source. `refId` is the stable external identity used during sync. |
| `User.js` | `users` | Local account, Google identity fields, and role. |
| `VendorProfile.js` | `vendorprofiles` | Vendor-facing company/profile information. |
| `UserBio.js` | `userbios` | Public profile/bio data. |
| `TORMatch.js` | `tormatches` | A user's saved/matched TOR relationship. |

### Procurement synchronization

| File | Role |
| --- | --- |
| `constants/smeGpConstants.js` | SME-GP URL, page size, retries, search terms, and inclusion/exclusion keywords. |
| `constants/bmaConstants.js` | BMA e-GP2 URL, budget year, page size, retries, and software filtering keywords. |
| `utils/torUtils.js` | Shared helpers for money parsing, category assignment, and retry waits. |
| `services/smeGpApi.js` | Calls the SME-GP API with `POST`; requests every search page, removes duplicate candidates, and maps software-related rows to the common TOR shape. |
| `services/bmaApi.js` | Calls BMA e-GP2 with `GET`; walks API pages, applies stricter software filters, and maps rows to the same TOR shape. |
| `services/syncService.js` | Saves normalized records using `refId` upserts, runs sources together, and returns sync summaries. |
| `services/syncScheduler.js` | Runs the optional startup sync and schedules daily sync at 02:00 Asia/Bangkok. |
| `controllers/syncController.js` | The manual-sync HTTP entry point. |
| `scripts/probe-sources.js` | Standalone diagnostic script for testing source availability. |

The two source modules are deliberately separate. Their APIs return different
JSON structures and use different HTTP methods, but both return this result:

```js
{
  source: "SME-GP" | "BMA-EGP2",
  method: "POST" | "GET",
  fetched: Number,
  tors: Array<NormalizedTor>
}
```

`services/syncService.js` is the only layer that knows how to persist that result.  It
uses `findOneAndUpdate(..., { upsert: true })`, so re-running a sync updates an
existing record instead of creating another record with the same `refId`.

## Frontend

### Framework and page layout

| File / folder | Role |
| --- | --- |
| `src/app/layout.tsx` | Global HTML shell, Google Identity script, global CSS, and application providers. |
| `src/app/(public)` | Public routes such as home, TOR browse/detail, dashboard, monitor, saved items, and notification settings. |
| `src/app/(auth)` | Login and registration pages. |
| `src/app/(vendor)/app` | Signed-in vendor workspace: overview, matches, TORs, saved items, alerts, and profile. |
| `src/app/(admin)` | Admin source-health page and layout. |
| `src/app/api/sources/health/route.ts` | Next.js server route used by the source-health panel. |
| `src/app/globals.css` and `src/styles/theme.css` | Tailwind/global visual tokens and shared theme styling. |

Route groups in parentheses are organisational only. They do not appear in the
browser URL. For example, `src/app/(public)/dashboard/page.tsx` renders at
`/dashboard`.

### Data and types

| File | Role |
| --- | --- |
| `src/types/tor.ts` | Shared TypeScript contracts used by all frontend screens. `Tor` is the normalized UI shape. |
| `src/lib/api.ts` | Backend client. Chooses a browser/server-safe API base URL and maps MongoDB fields into `Tor`. |
| `src/lib/auth.ts` | Typed calls for Google login, session lookup, and logout. |
| `src/lib/budget.ts` | Groups positive budgets by category and calculates min/median/max benchmark values. |
| `src/lib/sources/probe.ts` | Server-side checks for configured procurement source URLs. |
| `src/lib/utils.ts` | Small shared class-name utility. |
| `src/data/mock.ts` | Demo TORs plus formatting, translation-selection, and price-analysis helpers used by the UI. |
| `src/config/agencies.ts` | Agency/source metadata, source labels, and agency lookup helpers. |
| `src/config/navigation.ts` | Navigation item definitions. |
| `src/config/routes.ts` | Central URL builders. |
| `src/lib/i18n/dictionary.ts` | Thai and English UI copy. Add a key here rather than hard-coding repeated labels. |
| `src/hooks/use-mobile.ts` | Shared responsive breakpoint hook. |

The backend and frontend deliberately do not expose identical types. MongoDB
uses fields such as `_id`, `status`, and `source`; the UI uses `id`,
`lifecycle`, and `sourceKind`. `mapBackendTorToFrontendTor` in `lib/api.ts`
is the documented conversion boundary.

### Providers and authentication

| File | Role |
| --- | --- |
| `providers/query-provider.tsx` | Provides TanStack React Query cache. |
| `providers/locale-provider.tsx` | Stores Thai/English selection and exposes `t(key)`. |
| `providers/session-provider.tsx` | Loads `/api/auth/me`, exposes the current user, and owns logout. |
| `providers/saved-provider.tsx` | Keeps locally saved TOR IDs in browser storage. |
| `providers/notification-prefs-provider.tsx` | Keeps notification preferences in browser storage. |
| `providers/audience-provider.tsx` | Shares the selected viewing audience/role. |
| `components/auth/google-button.tsx` | Waits for Google's client script, renders its button, sends the credential to the backend, then redirects by role. |
| `components/auth/register-google.tsx` | Registration-specific Google sign-in wrapper. |
| `components/layout/account-control.tsx` | Displays session-aware account controls. |

### Dashboard and budget comparison

| File | Role |
| --- | --- |
| `app/(public)/dashboard/page.tsx` | Server component: loads TORs once and passes them to the client view. |
| `components/dashboard/dashboard-view.tsx` | Composes dashboard sections and derives headline counts. |
| `components/dashboard/budget-chart.tsx` | Renders category median budgets as a horizontal chart. |
| `components/dashboard/compare-budget-chart.tsx` | Shows each selected TOR budget beside its category median. |
| `components/dashboard/historical-price-table.tsx` | Renders all TORs with category median, analysis badge, sort state, and paginated page window. |
| `lib/budget.ts` | The statistics behind all dashboard charts and the table's average comparison. |

The table uses a 10-row page size. Page numbers are shown in windows of five;
first/previous/next/last buttons still work outside the visible window. The
analysis column sorts by `TOR budget / category median`, not by formatted text.

### Feature components

| Folder | What the components do |
| --- | --- |
| `components/tor` | Browse/filter/list/detail TORs, show source and agency badges, calculate budget comparison, save a TOR, and present match/fit/checklist information. |
| `components/home` | Public landing/monitor sections: KPIs, latest opportunities, matched items, agencies, capabilities, coverage, workflow, trust, and CTA. |
| `components/notifications` | Saved TOR list, alerts popover, and notification preference editor. |
| `components/admin` | Source health status panel. |
| `components/showcase` | Vendor showcase page content. |
| `components/layout` | Shared app shell, navigation bar, breadcrumbs, page headers, language toggle, brand lockup, footer, and view switcher. |
| `components/ui` | Reusable design-system primitives built around Radix/Tailwind. These should remain generic; feature rules belong in the folders above. |

## Common changes

### Add a new procurement source

1. Put the request, pagination, filtering, and mapping in
   `backend/src/services/<sourceName>Api.js`.
2. Put its configuration in `backend/src/constants/<sourceName>Constants.js`
   and return the common source result documented above.
3. Call it from `backend/src/services/syncService.js` and expose a sync route if manual
   operation is needed.
4. Add the public source metadata and `DataSourceKind` in
   `frontend/src/config/agencies.ts`.
5. Extend `mapBackendTorToFrontendTor` only when its normalized fields differ.

### Add a dashboard metric

1. Derive it from the `tors` prop in `dashboard-view.tsx`.
2. Put reusable number logic in `lib/budget.ts`, not the JSX component.
3. Add English and Thai labels to `lib/i18n/dictionary.ts`.

### Change login behaviour

1. Browser action: `components/auth/google-button.tsx` and `lib/auth.ts`.
2. API validation and account creation: `backend/src/controllers/authController.js`.
3. Cookie/JWT rules: `backend/src/utils/session.js`.
4. Global UI state: `frontend/src/components/providers/session-provider.tsx`.

## Important conventions

- `refId` is the external source's stable key. Never replace it with a random
  value when a source provides an ID or URL.
- Keep source-specific response parsing out of controllers and out of React
  components. Normalize it in the source adapter.
- Keep browser storage access inside client providers; server components do not
  have `window` or `localStorage`.
- Use `apiUrl()` / `api()` in `lib/api.ts` for backend requests. It prevents
  duplicate `/api/api/...` paths and sends cookies where required.
- Dashboard data uses `cache: "no-store"` so a manual sync is visible on the
  next request instead of serving stale server-rendered data.
