# احجز الملعب — Football Pitch Booking

A booking system for a **single football pitch**. Players open the site, see which
half-hour slots are still free today, and reserve one with a name and a phone
number — no account, no online payment, cash on arrival. Staff sign in to a
separate dashboard to see the day's schedule, record walk-in bookings, close off
hours for maintenance, set the hourly rate, and manage each other's accounts.

The interface is **Arabic, right-to-left**, and prices are in Egyptian pounds by
default (`ج.م`, configurable).

---

## What it does

### For players (public, no sign-in)

- **See a day's availability** as a grid of 48 half-hour slots, each labelled
  `available`, `booked`, `blocked` (closed by staff), or `passed` (kick-off time
  already gone).
- **Book a slot** by picking a kick-off time and a duration — 1 to 6 hours, in
  half-hour steps — then entering a name and phone number.
- **See the price before confirming**, calculated pro-rata from the owner's
  hourly rate.

### For staff (sign-in required)

- **Day agenda** — every booking touching a chosen date, including one that
  started the night before and ran past midnight, with daily totals.
- **Record a walk-in** — a manual booking on behalf of someone at the gate.
  Unlike players, staff may book a time that has already started.
- **Cancel a booking** — the record is kept (status becomes `cancelled`) and its
  slots are released for rebooking.
- **Block hours** — close a time range for maintenance, weather, or a private
  event, with an optional reason.
- **Manage their own account** — change display name, phone, and password.

### For the owner (superadmin only)

- **Set the hourly rate and currency.** Prices are snapshotted onto each booking
  when it is made, so changing the rate never rewrites what someone was quoted.
- **Manage staff** — create accounts, edit profiles, reset passwords, promote or
  demote between `admin` and `superadmin`, and deactivate accounts.

Access is revoked by **deactivating**, not deleting: the account can be restored,
the record of who once had access survives, and because the auth middleware
re-reads `isActive` on every request, a deactivation takes effect immediately
instead of whenever the signed-in user's token happens to expire.

---

## Tech stack

| | |
|---|---|
| **Backend** | Node.js (ESM) · Express 4 · TypeScript · MongoDB via Mongoose 8 |
| **Validation** | Zod schemas on every request body, query, and param |
| **Auth** | JWT bearer tokens · bcrypt password hashing (12 rounds) |
| **Hardening** | helmet · CORS allowlist · express-mongo-sanitize · hpp · per-IP rate limits |
| **Frontend** | Vue 3 (`<script setup>`) · Vite · TypeScript · Pinia · Vue Router · Tailwind CSS 4 |
| **Deployment** | Backend on Render · Frontend on Vercel |

---

## Repository layout

```
booking-stadium/
├── backend/                  Express + TypeScript API
│   └── src/
│       ├── app.ts            Express setup, middleware order, route mounting
│       ├── config/db.ts      Mongoose connection
│       ├── models/           Mongoose schemas (Admin, Booking, BlockedSlot, Setting)
│       ├── routes/           URL wiring only
│       ├── controllers/      HTTP in / HTTP out — thin
│       ├── services/         Business logic, no req/res
│       ├── validators/       Zod schemas per resource
│       ├── middlewares/      auth, validate, rate limits, error handler
│       └── utils/            time grid helpers, AppError, asyncHandler
├── frontend/                 Vue 3 SPA
│   └── src/
│       ├── views/            One per route (landing, booking, admin screens)
│       ├── components/       Pickers, agenda, booking list, staff manager
│       ├── stores/           Pinia: auth, bookings, staff
│       ├── services/         axios client, token storage
│       └── utils/            date/time/money formatting, availability helpers
└── render.yaml               Render service definition for the backend
```

The layering is deliberate: routes wire URLs, controllers translate HTTP, and
**services hold the logic** — so the booking rules are testable without an HTTP
request and reusable from a script.

---

## How the booking model works

This is the part worth understanding before changing anything.

**The grid.** A day is 48 units of 30 minutes. Thirty is what makes 1.5-hour
bookings expressible. A booking must be a whole number of units, at least 60
minutes and at most 360.

**Slot keys.** A booking stores the absolute units it occupies — 
`["2026-08-10T23:00", "2026-08-10T23:30", "2026-08-11T00:00"]` — rather than
just a start and end time. Because the pitch is open around the clock, a booking
running from 23:00 to 01:00 is normal, not exotic, and each key carries its own
date so those units land on both days.

**Duration, never a bare end time.** "23:00 to 01:00" is ambiguous about which
day 01:00 belongs to. The API takes a start plus a duration, and derives the end.

**Double-booking is prevented by the database, not by application code.** A
unique multikey index on `slotKeys` forbids two documents from sharing any array
element — which is exactly interval exclusion. A check-then-insert in JavaScript
can be raced by two simultaneous requests; a unique index cannot. The insert is
attempted and a duplicate-key error is translated into a `409`. The index is
partial (`status: 'confirmed'`) so cancelling a booking frees its slots.

**Pricing** is `round(duration / 60 × pricePerHour)` and is stored on the
booking at creation time.

---

## API

Base URL: `/api`. Protected routes expect `Authorization: Bearer <token>`.

### Auth — `/api/auth`

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/login` | public | Sign in; returns a JWT. Rate-limited to 10 per 15 min |
| GET | `/me` | staff | Current account — used to restore a session after reload |

### Bookings — `/api/bookings`

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/availability?date=` | public | The 48 slots of a date, each with a status |
| POST | `/` | public | Create a booking. Rate-limited to 20 per 10 min |
| GET | `/admin?date=` | staff | Every booking touching a date (omit `date` for all) |
| POST | `/admin` | staff | Record a walk-in booking |
| PATCH | `/admin/:id/cancel` | staff | Cancel, releasing the slots |

### Blocked slots — `/api/blocked-slots`

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/admin?date=` | staff | Closed ranges for a date |
| POST | `/admin` | staff | Close a range, with an optional reason |
| DELETE | `/admin/:id` | staff | Reopen it |

### Settings — `/api/settings`

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | public | Rate, currency, and the slot/duration limits the booking UI needs |
| PATCH | `/` | superadmin | Change the rate or currency |

### Staff — `/api/admins`

| Method | Path | Access | Purpose |
|---|---|---|---|
| PATCH | `/me` | staff | Update own name and phone |
| PATCH | `/me/password` | staff | Change own password |
| GET | `/` | superadmin | List staff |
| POST | `/` | superadmin | Create an account |
| PATCH | `/:id` | superadmin | Edit a profile |
| PATCH | `/:id/status` | superadmin | Activate / deactivate |
| PATCH | `/:id/role` | superadmin | Change role |
| PATCH | `/:id/password` | superadmin | Reset a password |

`GET /health` sits outside `/api` and returns `{"status":"ok"}` for uptime checks.

**There is no public registration endpoint.** The first superadmin is created by
a script on the server; every account after that is made by an existing
superadmin from the dashboard.

---

## Running locally

**Prerequisites:** Node.js 22+, and MongoDB — either a local `mongod` or a free
MongoDB Atlas cluster.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then edit .env — see the table below
npm run dev               # http://localhost:3000
```

| Variable | Required | Notes |
|---|---|---|
| `PORT` | no | Defaults to `3000` |
| `NODE_ENV` | no | `development` locally, `production` on Render |
| `MONGO_URI` | **yes** | Connection string |
| `JWT_SECRET` | **yes** | Long random string; different per environment |
| `JWT_EXPIRES_IN` | no | Defaults to `1d` |
| `CORS_ORIGIN` | **yes** | Comma-separated allowed origins. **The server crashes on startup if this is missing** |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | seeding only | Read once by the seed script, never at runtime |

### 2. Create the first superadmin

Credentials come from `.env` rather than the command line so the password never
lands in your shell history:

```bash
cd backend
npx tsx src/scripts/seedAdmin.ts
```

> **Note:** `src/scripts/` is git-ignored, so this file is not in a fresh clone —
> it's kept as a local operational script. On a new machine you'll need to copy
> it across or insert the first `Admin` document by hand (username, a bcrypt
> hash of the password in `passwordHash`, `role: 'superadmin'`, `isActive: true`).

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:3000/api
npm run dev               # http://localhost:5173
```

Sign in at `/admin/login`. The staff routes are intentionally unlinked from the
public UI — reachable by typing the URL, with the auth guard, not the missing
link, doing the actual access control.

### Scripts

**Backend:** `dev` (nodemon + tsx, type-checks on each restart) · `build` (tsc → `dist/`) · `start` (run the build) · `lint` · `lint:fix` · `format`

**Frontend:** `dev` · `build` (type-check + bundle) · `preview` · `lint` · `format`

---

## Deployment

### Backend → Render

[`render.yaml`](render.yaml) defines the service: root directory `backend`,
build `npm ci --include=dev && npm run build`, start `npm start`, health check
`/health`. The `--include=dev` matters — `typescript` and every `@types/*`
package live in `devDependencies`, so a production-mode install without it
leaves `tsc` with nothing to compile against.

Set `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and `CORS_ORIGIN` as
environment variables in the Render dashboard (they're marked `sync: false` so
real values stay out of the repo). `CORS_ORIGIN` must contain your deployed
frontend URL, or the browser will block every request. It has to stay an exact
allowlist — never `*` — because the browser refuses to send the session cookie to
a wildcard origin.

`NODE_ENV=production` is not optional here: it's what switches the session cookie
to `SameSite=None; Secure`. Without it the cookie is `Lax` and the browser drops
it on every cross-site request, so admin login fails while everything else looks
fine.

### Frontend → Vercel

[`frontend/vercel.json`](frontend/vercel.json) sets the build, an SPA rewrite,
and long-lived caching for hashed assets. The rewrite is what makes deep links
like `/admin/settings` survive a refresh: the router uses HTML5 history mode, so
those paths have no file on disk and the CDN must fall back to `index.html`.
Set the Vercel project's **Root Directory** to `frontend`, and
`VITE_API_BASE_URL` to your Render URL plus `/api`.

---

## Security notes

- Passwords are bcrypt-hashed at 12 rounds; `passwordHash` is `select: false`,
  so it's never returned by a normal query.
- Login returns the same error for an unknown username and a wrong password, and
  checks `isActive` only *after* the password — so no response distinguishes a
  deactivated account from a bad guess for anyone who doesn't already know the
  credentials.
- Rate limits: 300 requests / 15 min API-wide, 10 / 15 min on login, 20 / 10 min
  on public booking creation.
- The admin JWT lives in an **httpOnly cookie** (`booking_admin_token`), so no
  script on the page can read it. An XSS payload can still act as the admin while
  the page is open, but it can no longer walk off with a token that keeps working
  elsewhere. `Max-Age` is one day, matched to `JWT_EXPIRES_IN`, so the session
  survives a browser restart.
- Frontend and API sit on **different sites** (Vercel ↔ Render), so the cookie is
  `SameSite=None; Secure` in production and `Lax` locally, where both ends are
  localhost. Two consequences worth knowing:
  - **Safari, iOS and Brave block third-party cookies by default, so admin login
    will not work there.** Players are unaffected — public booking needs no
    session. Putting both ends on one site (a Vercel rewrite proxying `/api`, or
    a shared parent domain) is what would fix it.
  - `SameSite=None` gives up the cross-site protection `Lax` provides for free,
    which is why CSRF protection is mandatory here rather than optional.
- **CSRF:** login mints a random value, seals it inside the JWT and returns it in
  the response body. The frontend keeps its copy in a first-party cookie on its
  own origin — the session cookie belongs to the API's domain and is unreadable
  here, so the usual double-submit trick of reading the server's own cookie is
  not available across sites — and echoes it back in `X-CSRF-Token` on every
  write; [`middlewares/csrf.ts`](backend/src/middlewares/csrf.ts) rejects any
  cookie-authenticated `POST`/`PATCH`/`DELETE` whose header doesn't match. A
  forged request from another site carries the cookie but cannot learn the value
  — the cookie is unreadable and CORS keeps the login body to our own origin.
  Requests with no session cookie are exempt, so players still book without
  signing in.
- Signing out is a `POST /api/auth/logout`: only the server can delete a cookie
  it marked httpOnly.
