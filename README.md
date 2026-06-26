# Noon Conference Attendance

A cross-platform attendance app for daily noon conference. Residents check in
from their phone by typing their name, picking their PGY level, and entering
the day's check-in code. The organizer controls the code/topic from a
passcode-protected screen and can generate an Excel attendance report on demand.

## Stack and choices made

- **Frontend**: Progressive Web App — React + Vite + Tailwind CSS, with a
  service worker / manifest (`vite-plugin-pwa`) so it can be added to the home
  screen on iOS and Android with no app store submission.
- **Backend**: Node.js + Express, runnable either as a normal long-lived
  server (`npm run dev`) or wrapped as a Netlify Function for deployment —
  same Express app either way (`server/src/app.js`).
- **Database**: [Netlify Blobs](https://docs.netlify.com/blobs/overview/) —
  a key-value store built into every Netlify site with zero extra
  configuration (no separate account, no connection string). Locally
  (running plain `node`, outside `netlify dev`), the app falls back
  automatically to a single JSON file on disk, so dev needs no account either.
- **Excel**: SheetJS (`xlsx` package). The "Generate Report" button on the
  Organizer screen downloads an `.xlsx` directly to the browser — no email
  step, no PDF.

**Live deployment**: this is set up to deploy as a single Netlify site (PWA +
API both on one domain, one shareable URL) using only a Netlify account — see
[DEPLOY_NETLIFY.md](DEPLOY_NETLIFY.md).

## Folder structure

```
noon-conference-attendance/
  server/             Express API + Netlify Blobs + xlsx report generation
    src/
      routes/         conferences.js, checkins.js, report.js
      app.js          builds the Express app (routes, middleware) — no listen()
      index.js        local dev entrypoint (calls app.listen)
      store.js        key-value storage (Netlify Blobs in prod, local JSON file in dev)
      code.js         daily check-in code generator
      time.js         Eastern-time helpers (configurable)
      auth.js         organizer passcode middleware
      report.js       xlsx builder
    .env.example
  netlify/functions/
    api.mjs           wraps server/src/app.js with serverless-http for deployment
    package.json      runtime deps for the deployed function
  web/                React + Vite + Tailwind PWA
    src/
      pages/          CheckIn.jsx, Today.jsx, Organizer.jsx
      lib/api.js       API client
    .env.example
  netlify.toml        build + redirect config for the combined deploy
```

## Data model

Stored as two kinds of JSON values, keyed by conference date:

- `conference:{date}` → `{ date, topic, check_in_code }`
- `checkins:{date}` → array of `{ resident_name, pgy_level, timestamp }`

Duplicate check-ins for the same name on the same date are rejected at the
application level (checked against the existing array before appending).
There is no separate residents/roster table — names are typed at check-in
and PGY level is chosen from a dropdown (`PGY-1`, `PGY-2`, `PGY-3`, `Attending`).

## How the daily code works

- The first time a given conference date is touched (organizer opens it, or a
  resident checks in on that date), a 6-character code is auto-generated
  (uppercase letters + digits, excluding `0/O` and `1/I`).
- The code is stored server-side only. The resident-facing endpoints
  (`/api/conferences/today`, `/api/checkins/today`) never return it.
- Check-in (`POST /api/checkins`) always re-validates the submitted code
  against the stored code for that date on the server — the client's opinion
  of validity is never trusted.
- The organizer can view the current code and regenerate it from the
  Organizer screen; regenerating immediately invalidates the old code (it's
  overwritten in storage).

## Setup

### Prerequisites

- Node.js 18+ and npm

### 1. Backend

```bash
cd server
cp .env.example .env
# edit .env — see "Environment variables" below
npm install
npm run dev       # starts the API on http://localhost:4000
```

### 2. Frontend

```bash
cd web
cp .env.example .env
# edit .env if your API isn't on localhost:4000
npm install
npm run dev       # starts the PWA on http://localhost:5173
```

Open `http://localhost:5173` on your phone (same Wi-Fi, use your computer's
LAN IP instead of localhost) and use "Add to Home Screen" to install it as an
app icon. Use the **Organizer** tab with the passcode for organizer controls.

## Environment variables

### `server/.env`

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `TIME_ZONE` | IANA time zone for conference dates/timestamps (default `America/New_York`) |
| `ORGANIZER_PASSCODE` | Passcode required for all organizer endpoints/screens |
| `WEB_ORIGIN` | CORS origin allowed to call the API (your frontend's URL) |

### `web/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API for local dev, e.g. `http://localhost:4000/api`. Leave unset in production — defaults to the relative path `/api` on the same Netlify domain. |

**Never commit `.env` files.** Only `.env.example` files are tracked in git.

## Running the report flow

From the Organizer screen: enter the passcode, optionally set the topic,
view/regenerate the code, then tap **Generate Report**. This downloads an
`.xlsx` with columns `[Name, PGY, Conference Date, Topic, Check-in Time]` for
everyone checked in on the selected date.

You can also hit the endpoint directly:
`GET /api/report/xlsx?date=YYYY-MM-DD` (requires the organizer passcode header).

## Deploying

This repo is set up to deploy as a single Netlify site (frontend + API
function on one domain → one shareable link), using only a Netlify account —
no separate database signup. Full step-by-step instructions are in
[DEPLOY_NETLIFY.md](DEPLOY_NETLIFY.md).

If you'd rather run the backend on a traditional always-on Node host instead
(Render, Railway, Fly.io, a VPS), note that `@netlify/blobs` only works inside
a Netlify deploy context — off Netlify, `server/src/store.js` falls back to a
local JSON file, which won't persist correctly across multiple server
instances or redeploys on most hosts. For a non-Netlify host, swap `store.js`
for a real database (e.g. swap back to Turso/Postgres) instead.

## Assumptions made

- "Generate Report" runs against the **currently selected conference date**
  on the Organizer screen (defaults to today); there's no multi-day batch report.
- No email sending and no PDF — the report is an `.xlsx` file downloaded
  directly by the organizer. (The original spec asked for email + PDF; this
  was simplified at the user's request to reduce moving parts for deployment.)
- There is no resident roster/directory. Anyone can check in by typing their
  name; duplicate check-ins for the same name (case-insensitive) on the same
  date are still rejected.
- Local-file mode (`server/data/store.json`) is single-writer-safe via an
  in-process queue, but isn't meant for concurrent multi-instance production
  use — that's what Netlify Blobs is for once deployed.
- PGY level is one of `PGY-1`, `PGY-2`, `PGY-3`, or `Attending`, chosen from a
  dropdown at check-in (stored as plain text on the backend, so the option
  list can be changed in `web/src/pages/CheckIn.jsx` without a migration).
