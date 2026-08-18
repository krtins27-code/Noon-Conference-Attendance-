// Session dimension shared across conference/checkin/report storage.
// A "session" distinguishes the Morning and Noon conferences that run on the
// same calendar date, each with its own code, topic/presenter, and attendance.

export const SESSIONS = ["morning", "noon"];
export const DEFAULT_SESSION = "noon";

export function isValidSession(session) {
  return SESSIONS.includes(session);
}

// Accept an incoming session value: default to Noon when absent/blank (keeps
// pre-split API calls working), but reject an explicit unknown value loudly.
export function normalizeSession(session) {
  if (session === undefined || session === null || session === "") {
    return DEFAULT_SESSION;
  }
  if (!isValidSession(session)) {
    throw new Error(`Invalid session: ${session}`);
  }
  return session;
}

export function confKey(date, session) {
  return `conference:${date}:${session}`;
}

export function checkinsKey(date, session) {
  return `checkins:${date}:${session}`;
}

// Pre-split keys (date only). Adopted into the Noon session on first touch.
export function legacyConfKey(date) {
  return `conference:${date}`;
}

export function legacyCheckinsKey(date) {
  return `checkins:${date}`;
}
