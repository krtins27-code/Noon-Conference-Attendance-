import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

// Isolate the local-file store before importing anything that touches it.
const STORE = path.join(os.tmpdir(), `obh-conf-test-${process.pid}-${Date.now()}.json`);
process.env.STORE_FILE = STORE;

const { getOrCreateConference } = await import("./conferences.js");
const { setJSON, getJSON } = await import("../store.js");

beforeEach(async () => {
  await fs.rm(STORE, { force: true });
});

after(async () => {
  await fs.rm(STORE, { force: true });
});

test("fresh create yields a code and empty topic/presenter", async () => {
  const conf = await getOrCreateConference("2026-08-18", "morning");
  assert.equal(conf.date, "2026-08-18");
  assert.equal(conf.session, "morning");
  assert.equal(conf.topic, "");
  assert.equal(conf.presenter, "");
  assert.match(conf.check_in_code, /^[A-Z2-9]{6}$/);
});

test("morning and noon on the same date have independent codes", async () => {
  const m = await getOrCreateConference("2026-08-18", "morning");
  const n = await getOrCreateConference("2026-08-18", "noon");
  assert.notEqual(m.check_in_code, n.check_in_code);
});

test("migrate-on-touch adopts a legacy date-only conference into noon", async () => {
  await setJSON("conference:2026-01-01", { date: "2026-01-01", topic: "Old Topic", check_in_code: "LEGACY" });
  await setJSON("checkins:2026-01-01", [{ resident_name: "Prior Person", pgy_level: "PGY-2", timestamp: "t" }]);

  const conf = await getOrCreateConference("2026-01-01", "noon");
  assert.equal(conf.check_in_code, "LEGACY");
  assert.equal(conf.topic, "Old Topic");
  assert.equal(conf.presenter, "");
  assert.equal(conf.session, "noon");

  const adopted = await getJSON("checkins:2026-01-01:noon");
  assert.equal(adopted.length, 1);
  assert.equal(adopted[0].resident_name, "Prior Person");
});

test("legacy adoption does not leak into morning", async () => {
  await setJSON("conference:2026-01-01", { date: "2026-01-01", topic: "Old", check_in_code: "LEGACY" });
  const morning = await getOrCreateConference("2026-01-01", "morning");
  assert.notEqual(morning.check_in_code, "LEGACY");
  assert.equal(morning.topic, "");
});
