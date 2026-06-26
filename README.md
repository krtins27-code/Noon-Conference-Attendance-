# Noon Conference Attendance

A cross-platform attendance app for daily noon conference. Residents check in
from their phone using a roster + a daily, server-validated code. The organizer
controls the code/topic from a passcode-protected screen and can generate and
email an attendance report (PDF + Excel).

## Stack and choice made

- **Frontend**: Progressive Web App — React + Vite + Tailwind CSS, with a
  service worker / manifest (`vite-plugin-pwa`) so it can be added to the home
  screen on iOS and Android with no app store submission. This was the
  preferred default in the spec for fastest deployment across both platforms.
- **Backend**: Node.js + Express, runnable either as a normal long-lived
  server (`npm run dev`) or wrapped as a Netlify Function for deployment —
  same Express app either way (`server/src/app.js`).
- **Database**: SQLite-compatible via `@libsql/client`. Locally this points at
  a plain SQLite file (no account needed). In production it points at a
  hosted [Turso](https://turso.tech) database, since serverless functions
  have no persistent local filesystem — the SQL is identical either way.
- **Excel**: SheetJS (`xlsx` package).
- **PDF**: an HTML attendance table rendered to PDF with headless Chrome via
  `puppeteer-core` + `@sparticuz/chromium-min` (a serverless-friendly Chromium
  build), not a binary conversion of the xlsx.
- **Email**: `nodemailer`. Uses Resend's SMTP endpoint if `RESEND_API_KEY` is
  set, otherwise falls back to generic SMTP credentials. No keys are hardcoded.

**Live deployment**: this is set up to deploy as a single Netlify site (PWA +
API both on one domain, one shareable URL). See
[DEPLOY_NETLIFY.md](DEPLOY_NETLIFY.md) for the exact steps, including the
free accounts (Turso, Netlify, Resend) you'll need to create.

## Folder structure

```
noon-conference-attendance/
  server/             Express API + libsql (SQLite/Turso) + report/email generation
    src/
      routes/         residents.js, conferences.js, checkins.js, report.js
      app.js          builds the Express app (routes, middleware) — no listen()
      index.js        local dev entrypoint (calls app.listen)
      db.js           schema + libsql client (local file or Turso)
      code.js         daily check-in code generator
      time.js         Eastern-time helpers (configurable)
      auth.js         organizer passcode middleware
      report.js       xlsx + pdf builders
      email.js        nodemailer transport + send
      seed.js         seed script (example residents)
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

- `residents`: id, name (unique), pgy_level, active
- `conferences`: id, date (unique, YYYY-MM-DD), topic, check_in_code
- `checkins`: id, conference_id, resident_name, pgy_level, timestamp
  (unique on `conference_id` + `resident_name` — enforces one check-in per
  resident per day at the database level)

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
  overwritten in the database).

## Setup

### Prerequisites

- Node.js 18+ and npm
- (For email) a Resend API key, or SMTP credentials from any provider

### 1. Backend

```bash
cd server
cp .env.example .env
# edit .env — see "Environment variables" below
npm install
npm run seed     # adds a few example residents
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
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Leave blank for local dev (uses a local SQLite file). Required in production — see [DEPLOY_NETLIFY.md](DEPLOY_NETLIFY.md). |
| `TIME_ZONE` | IANA time zone for conference dates/timestamps (default `America/New_York`) |
| `ORGANIZER_PASSCODE` | Passcode required for all organizer endpoints/screens |
| `RESEND_API_KEY` | If set, email is sent via Resend's SMTP relay |
| `EMAIL_FROM` | From address, e.g. `"Noon Conference <noreply@yourdomain.org>"` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | Used instead of Resend if `RESEND_API_KEY` is not set |
| `REPORT_RECIPIENT` | Report recipient email (defaults to `KSinghal@bhmcny.org`) |
| `WEB_ORIGIN` | CORS origin allowed to call the API (your frontend's URL) |
| `PROGRAM_NAME` | Optional, shown in the PDF header and email body |

### `web/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API for local dev, e.g. `http://localhost:4000/api`. Leave unset in production — defaults to the relative path `/api` on the same Netlify domain. |

**Never commit `.env` files.** Only `.env.example` files are tracked in git.

## Running the report flow

From the Organizer screen: enter the passcode, optionally set the topic,
view/regenerate the code, then tap **Generate and Email Report**. This:

1. Builds an `.xlsx` with columns `[Name, PGY, Conference Date, Topic, Check-in Time]`.
2. Renders the same data as an HTML table with a header (program name, date,
   topic, total present) and converts it to PDF via headless Chrome.
3. Emails the PDF (with the `.xlsx` attached) to `REPORT_RECIPIENT`, subject
   `"Noon Conference Attendance, [date], [topic]"`.

You can also download the files directly without emailing:
`GET /api/report/xlsx?date=YYYY-MM-DD` and `GET /api/report/pdf?date=YYYY-MM-DD`
(both require the organizer passcode header).

## Deploying

This repo is set up to deploy as a single Netlify site (frontend + API
function on one domain → one shareable link). Full step-by-step instructions,
including the free third-party accounts you'll need (Turso for the database,
Netlify for hosting, Resend for email), are in
[DEPLOY_NETLIFY.md](DEPLOY_NETLIFY.md).

If you'd rather run the backend on a traditional always-on Node host instead
(Render, Railway, Fly.io, a VPS) — which also works, and avoids the
serverless-Chromium download step — point `TURSO_DATABASE_URL` /
`TURSO_AUTH_TOKEN` at the same Turso database (or skip Turso entirely and use
the local-file mode there, since a regular host has a persistent disk), run
`server/src/index.js` normally, and deploy `web/` to any static host with
`VITE_API_URL` set to that backend's URL.

## Assumptions made

- "Generate and email report" runs against the **currently selected
  conference date** on the Organizer screen (defaults to today); there's no
  multi-day batch report.
- A resident not on the roster can type their name in free text at check-in;
  this is recorded as-is and isn't reconciled against the roster table to
  avoid blocking a real attendee with a typo'd name. If the organizer manages
  the roster carefully, this should rarely come up.
- The roster picker only shows residents marked `active`. "Removing" a
  resident soft-deletes them (`active = 0`) rather than hard-deleting, so past
  check-in records remain intact for historical reports.
- Resending a report for the same date is allowed any number of times (no
  "already sent" lock), since the organizer may want to re-send after late
  check-ins.
- The optional scheduled daily send (e.g. 1:30 PM ET) was treated as a bonus
  and not implemented in code; the on-demand button is the priority per spec.
  Wiring up a `node-cron` job that calls the same logic as
  `POST /api/report/send` would be a small follow-up if wanted.
- PGY level is a free-ish set of options (`PGY-1`...`PGY-5`, `Other`) in the
  UI but stored as plain text, so it adapts to non-categorical programs.
- The deployed PDF generation uses `@sparticuz/chromium-min`, which downloads
  a Chromium build at runtime and caches it per function instance. This adds
  latency to the first report generation after a cold start (and on Netlify's
  free tier, synchronous functions are capped at 10s — see the troubleshooting
  section of [DEPLOY_NETLIFY.md](DEPLOY_NETLIFY.md) if that becomes an issue).
