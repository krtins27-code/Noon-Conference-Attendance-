import { test } from "node:test";
import assert from "node:assert/strict";
import { SESSIONS, SESSION_LABELS, defaultSession } from "./sessions.js";

test("SESSIONS and labels", () => {
  assert.deepEqual(SESSIONS, ["morning", "noon"]);
  assert.equal(SESSION_LABELS.morning, "Morning");
  assert.equal(SESSION_LABELS.noon, "Noon");
});

test("defaultSession is morning before 11:00 and noon from 11:00", () => {
  assert.equal(defaultSession(new Date("2026-08-18T07:59:00")), "morning");
  assert.equal(defaultSession(new Date("2026-08-18T10:59:00")), "morning");
  assert.equal(defaultSession(new Date("2026-08-18T11:00:00")), "noon");
  assert.equal(defaultSession(new Date("2026-08-18T15:00:00")), "noon");
});
