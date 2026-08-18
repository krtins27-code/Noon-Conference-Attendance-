// Shared session vocabulary for the web app. Mirrors the server's session model:
// each calendar date has a Morning and a Noon conference, tracked separately.

export const SESSIONS = ["morning", "noon"];
export const SESSION_LABELS = { morning: "Morning", noon: "Noon" };

// Default the resident/organizer view to whichever conference is "current":
// Morning before 11:00 local, Noon from 11:00 onward.
export function defaultSession(now = new Date()) {
  return now.getHours() < 11 ? "morning" : "noon";
}
