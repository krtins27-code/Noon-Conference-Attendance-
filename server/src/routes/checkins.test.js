import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

const STORE = path.join(os.tmpdir(), `obh-checkin-test-${process.pid}-${Date.now()}.json`);
process.env.STORE_FILE = STORE;
process.env.ORGANIZER_PASSCODE = "test-pass";

const { createApp } = await import("../app.js");
const { getOrCreateConference } = await import("./conferences.js");

let server;
let base;

before(async () => {
  const app = await createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((r) => server.close(r));
  await fs.rm(STORE, { force: true });
});

beforeEach(async () => {
  await fs.rm(STORE, { force: true });
});

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test("wrong code is rejected with 403", async () => {
  await getOrCreateConference("2026-08-18", "noon"); // create with a known-unknown code
  const r = await post("/api/checkins", {
    resident_name: "Sam Roy", pgy_level: "PGY-1", code: "WRONG1", date: "2026-08-18", session: "noon",
  });
  assert.equal(r.status, 403);
});

test("correct code checks in, duplicate name in same session is 409", async () => {
  const conf = await getOrCreateConference("2026-08-18", "noon");
  const ok = await post("/api/checkins", {
    resident_name: "Sam Roy", pgy_level: "PGY-1", code: conf.check_in_code, date: "2026-08-18", session: "noon",
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.session, "noon");

  const dup = await post("/api/checkins", {
    resident_name: "sam roy", pgy_level: "PGY-1", code: conf.check_in_code, date: "2026-08-18", session: "noon",
  });
  assert.equal(dup.status, 409);
});

test("same resident may check into both morning and noon", async () => {
  const morning = await getOrCreateConference("2026-08-18", "morning");
  const noon = await getOrCreateConference("2026-08-18", "noon");

  const a = await post("/api/checkins", {
    resident_name: "Amy Chen", pgy_level: "PGY-2", code: morning.check_in_code, date: "2026-08-18", session: "morning",
  });
  const b = await post("/api/checkins", {
    resident_name: "Amy Chen", pgy_level: "PGY-2", code: noon.check_in_code, date: "2026-08-18", session: "noon",
  });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
});

test("a morning code does not work for the noon session", async () => {
  const morning = await getOrCreateConference("2026-08-18", "morning");
  await getOrCreateConference("2026-08-18", "noon");
  const r = await post("/api/checkins", {
    resident_name: "Lee Park", pgy_level: "PGY-3", code: morning.check_in_code, date: "2026-08-18", session: "noon",
  });
  assert.equal(r.status, 403);
});
