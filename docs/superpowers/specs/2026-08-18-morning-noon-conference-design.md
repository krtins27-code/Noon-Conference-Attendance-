# Morning & Noon Conference — Split Sessions + Presenter (Netlify-Blobs app)

**Date:** 2026-08-18
**Repo:** `Noon-Conference-Attendance-` (Vite/React `web/` + Express `server/` deployed as a Netlify Function; persistence via Netlify Blobs)
**Status:** Design — supersedes the earlier Supabase-targeted spec, which was written against the OLD deployed app.

## 1. Goal

Split the single daily conference into two independently tracked sessions — **Morning** (8:00 AM) and **Noon** (12:00 PM) — each with its own check-in code and its own attendance, and add a **Presenter** field alongside the existing Topic. Residents pick a session, see its topic/presenter, and check in with that session's code. One organizer login manages both.

## 2. Baseline (what already exists)

- **Storage (Netlify Blobs):** `conference:${date}` → `{ date, topic, check_in_code }`; `checkins:${date}` → `[{ resident_name, pgy_level, timestamp }]`. Local-JSON fallback for dev.
- **Codes:** server-side **random** 6-char per conference (`generateCheckInCode`), revealed only to the organizer, validated server-side. Organizer can **regenerate** a code (invalidates the old one) — this is the app's equivalent of a "late code", done manually, with no time gate.
- **Topic:** already end-to-end — organizer sets it (`PUT /conferences/:date/topic`), residents see it (`GET /conferences/today`, rendered on Today/CheckIn).
- **Auth:** organizer passcode (`ORGANIZER_PASSCODE`) via `x-organizer-passcode` header; `requireOrganizer` middleware; passcode kept in `sessionStorage`.
- **Frontend:** react-router pages `CheckIn` (`/`), `Today` (`/today`), `Organizer` (`/organizer`); API client `web/src/lib/api.js`.
- **No test runner is installed.**

## 3. Session model

- Session values are the literals `'morning'` and `'noon'`.
- Blob keys gain the session: `conference:${date}:${session}` and `checkins:${date}:${session}`.
- The conference object gains `session` and `presenter`: `{ date, session, topic, presenter, check_in_code }`.
- Because each session is a separate conference object, the two sessions get **different random codes automatically** — no hashing/secret work is needed.

### 3.1 Backfill of existing data → Noon (migrate-on-touch)
Existing `conference:${date}` / `checkins:${date}` are treated as the **Noon** session. When the Noon session for a date is first accessed and no `:noon` key exists, the store copies any legacy unkeyed value into `conference:${date}:noon` / `checkins:${date}:noon` (preserving the original code and check-ins), then proceeds. This is idempotent and needs no separate migration job; legacy keys are left in place, harmless.

## 4. API changes (Express)

Every conference/checkin/report endpoint gains a `session` parameter (query for GET, body/route for writes). When omitted it defaults to `'noon'` for backward compatibility. `session` is validated against `['morning','noon']`; anything else → 400.

- `GET  /conferences/today?session=` → `{ date, session, topic, presenter }` (no code)
- `GET  /conferences/today/organizer?session=&date=` → full object incl. `check_in_code`
- `PUT  /conferences/:date/details` (was `/topic`) — body `{ session, topic, presenter }`; sets both fields
- `POST /conferences/:date/regenerate-code` — body `{ session }`
- `POST /checkins` — body `{ resident_name, pgy_level, code, date, session }`
- `GET  /checkins/today?session=` → `{ date, session, topic, presenter, count, checkins }`
- `GET  /report/xlsx?session=` — per-session workbook; the sheet/title notes the session

The dedupe rule (one check-in per name) is scoped per `(date, session)`, so a resident can attend both Morning and Noon on the same day.

## 5. Frontend changes

A small shared module `web/src/lib/sessions.js` exports `SESSIONS`, `SESSION_LABELS`, and `defaultSession(now)` (Morning before 11:00 local, else Noon), plus a reusable `SessionToggle` component.

- **CheckIn:** session toggle at top (default by time). On change, fetch that session's `{ topic, presenter }` and show them; submit the check-in with `session`.
- **Today:** session toggle; fetch that session's count/list and topic/presenter.
- **Organizer:** session toggle; for the selected session show the **code** + **Regenerate**, an editor for **Topic** and **Presenter** (saved via `PUT …/details`), and **Generate Report** for that session.

## 6. Deliberately unchanged

- **No time-gated "late code."** This repo's model is manual regeneration by the organizer at any time; that is kept as-is (the earlier 8:15/12:15 thresholds came from the old app and do not apply). Session **start times** (8:00 / 12:00) are used only for the resident toggle's default selection.
- **Auth** stays the single organizer passcode (server-side) — already solid; no per-session logins.
- **Code generation** stays random-per-conference.
- **Storage** stays Netlify Blobs.

## 7. Testing

The repo has no test runner. Add a lightweight, dependency-free setup:
- **Server unit tests** via Node's built-in `node:test` (add `"test": "node --test"` to `server/package.json`): session validation/defaulting, blob-key construction, and the migrate-on-touch backfill using the local-JSON store mode.
- **Shared web logic** (`defaultSession`) tested with `node:test` (pure function).
- **React pages / full API:** manual e2e (consistent with the repo's current no-frontend-test posture) — see the plan's verification steps.

## 8. Rollout

1. Land server + web changes behind the session parameter (defaults to Noon, so nothing breaks pre-migration).
2. Deploy; verify Noon behaves exactly as before and old data appears under Noon (migrate-on-touch).
3. Announce Morning to organizers/residents.

Rollback: reverting the bundle restores date-only behavior; session-keyed blobs are additive and legacy keys are untouched.
