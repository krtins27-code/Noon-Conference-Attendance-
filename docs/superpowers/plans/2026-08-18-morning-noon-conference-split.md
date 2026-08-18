# Morning & Noon Split + Presenter — Implementation Plan (Netlify-Blobs app)

> Execute task-by-task. Server logic is covered by `node:test`; React pages are verified manually. Commit after each task.

**Goal:** Two independently tracked sessions (Morning 8:00 / Noon 12:00), each with its own code and attendance, plus a Presenter field; one organizer login manages both.

**Architecture:** Add a `session` (`'morning'|'noon'`) dimension keyed into Netlify Blobs (`conference:{date}:{session}`, `checkins:{date}:{session}`). Codes stay server-side random per conference (different per session automatically). Legacy date-only data is adopted into Noon on first touch. Frontend gains a session toggle on all three pages and a Presenter editor in Organizer.

## Global constraints
- Session literals exactly `'morning'` / `'noon'`; validate and default to `'noon'` when absent.
- Preserve existing behavior for Noon so nothing breaks pre-migration.
- No new runtime dependencies. Tests use Node's built-in `node:test`.
- Keep the existing Tailwind look and the organizer passcode auth unchanged.

---

## Task 1 — Server session helpers (`server/src/sessions.js`) + tests
**Files:** create `server/src/sessions.js`, `server/src/sessions.test.js`; modify `server/package.json` (add `"test": "node --test"`).
- Exports: `SESSIONS = ['morning','noon']`; `isValidSession(s)`; `normalizeSession(s)` → valid session or `'noon'` when missing/blank (throws on an invalid non-empty value); `confKey(date, s)` → `conference:${date}:${s}`; `checkinsKey(date, s)` → `checkins:${date}:${s}`; `legacyConfKey(date)`; `legacyCheckinsKey(date)`.
- Tests: valid/invalid detection; default to noon on undefined/""; throw on `"evening"`; key formats.
- Verify: `cd server && npm test` → PASS. Commit.

## Task 2 — Conferences route: session-keyed + presenter + migrate-on-touch
**Files:** modify `server/src/routes/conferences.js`; tests `server/src/routes/conferences.test.js` (local-file store mode).
- `getOrCreateConference(date, session)`: read `confKey`; if missing and session is `noon`, adopt legacy `conference:${date}` (copy to `confKey`, and copy `checkins:${date}` → `checkinsKey` if present) before creating; when creating fresh, object = `{ date, session, topic:'', presenter:'', check_in_code: generateCheckInCode() }`. Backfill `presenter:''`/`session` on older objects lacking them.
- Endpoints: `GET /today?session=` → `{date,session,topic,presenter}`; `GET /today/organizer?session=&date=` → full; `PUT /:date/details` (replaces `/topic`) body `{session,topic,presenter}` → set both; `POST /:date/regenerate-code` body `{session}`.
- Export `getOrCreateConference`.
- Tests (local store): fresh create yields code + empty topic/presenter; migrate-on-touch adopts a legacy `conference:2026-01-01` into `:noon` with same code; `PUT details` sets topic+presenter; morning and noon for same date have independent codes.
- Verify `npm test` PASS. Commit.

## Task 3 — Checkins route: session-scoped dedupe
**Files:** modify `server/src/routes/checkins.js`; tests `server/src/routes/checkins.test.js`.
- `POST /` reads `{resident_name,pgy_level,code,date,session}`; validates session; validates code against that session's conference; dedupe within `checkinsKey(date,session)`; store to `checkinsKey`.
- `GET /today?session=` returns `{date,session,topic,presenter,count,checkins}`.
- Tests: wrong code → 403; correct code stores under session key; same name twice → 409; same name in the other session → allowed.
- Verify `npm test` PASS. Commit.

## Task 4 — Report route + xlsx: session-aware + presenter
**Files:** modify `server/src/routes/report.js`, `server/src/report.js`.
- `/report/xlsx?session=` loads that session; sheet title/name notes the session; include Presenter and Session columns.
- Verify build/lint by running the server locally and hitting the endpoint (manual) OR a unit test that `buildAttendanceXlsx` returns a Buffer for a session payload. Commit.

## Task 5 — Web session helper + API client
**Files:** create `web/src/lib/sessions.js`, `web/src/lib/sessions.test.js`; modify `web/src/lib/api.js`.
- `sessions.js`: `SESSIONS`, `SESSION_LABELS = {morning:'Morning', noon:'Noon'}`, `defaultSession(now=new Date())` → `'morning'` if `now.getHours() < 11` else `'noon'`.
- Test `defaultSession` boundaries with `node --test` (pure). Add `"test":"node --test"` to `web/package.json`.
- `api.js`: thread `session` through `getTodayConference(session)`, `getOrganizerConference(date,session)`, `setDetails(date,{topic,presenter},session)` (rename from setTopic), `regenerateCode(date,session)`, `checkIn(payload)` (payload includes session), `getTodayCheckins(session)`, `downloadReport(date,session)`.
- Verify `cd web && npm test` PASS. Commit.

## Task 6 — SessionToggle component + CheckIn page
**Files:** create `web/src/components/SessionToggle.jsx`; modify `web/src/pages/CheckIn.jsx`.
- `SessionToggle`: two-button segmented control, props `{value, onChange}`, styled with existing Tailwind (brand-600 active).
- CheckIn: `session` state = `defaultSession()`; toggle at top; fetch `getTodayConference(session)` on change, render topic + presenter (or muted "Topic not posted yet"); submit `checkIn({resident_name,pgy_level,code,session})`.
- Verify manually (Task 8). Commit.

## Task 7 — Today + Organizer pages
**Files:** modify `web/src/pages/Today.jsx`, `web/src/pages/Organizer.jsx`.
- Today: session toggle; `getTodayCheckins(session)`; show topic/presenter + count/list for the session.
- Organizer: session toggle; for the selected session show code + Regenerate, Topic + Presenter inputs saved via `setDetails`, and Generate Report for that session.
- Verify manually (Task 8). Commit.

## Task 8 — Full verification
- `cd server && npm test` and `cd web && npm test` → PASS.
- `cd web && npm run build` → succeeds.
- Local run (`server` on :4000, `web` dev): Morning code checks into Morning only; Noon only into Noon; a resident can be in both; topic+presenter set in Organizer appear on the matching CheckIn/Today session; report downloads per session; a pre-existing (legacy) date shows under Noon with its original code.
- Commit any fixes.
