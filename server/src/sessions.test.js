import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SESSIONS,
  isValidSession,
  normalizeSession,
  confKey,
  checkinsKey,
  legacyConfKey,
  legacyCheckinsKey,
} from "./sessions.js";

test("SESSIONS are morning and noon", () => {
  assert.deepEqual(SESSIONS, ["morning", "noon"]);
});

test("isValidSession", () => {
  assert.equal(isValidSession("morning"), true);
  assert.equal(isValidSession("noon"), true);
  assert.equal(isValidSession("evening"), false);
  assert.equal(isValidSession(undefined), false);
});

test("normalizeSession defaults blank/undefined to noon", () => {
  assert.equal(normalizeSession(undefined), "noon");
  assert.equal(normalizeSession(null), "noon");
  assert.equal(normalizeSession(""), "noon");
  assert.equal(normalizeSession("morning"), "morning");
});

test("normalizeSession throws on an invalid non-empty value", () => {
  assert.throws(() => normalizeSession("evening"), /Invalid session/);
});

test("key builders", () => {
  assert.equal(confKey("2026-08-18", "morning"), "conference:2026-08-18:morning");
  assert.equal(checkinsKey("2026-08-18", "noon"), "checkins:2026-08-18:noon");
  assert.equal(legacyConfKey("2026-08-18"), "conference:2026-08-18");
  assert.equal(legacyCheckinsKey("2026-08-18"), "checkins:2026-08-18");
});
