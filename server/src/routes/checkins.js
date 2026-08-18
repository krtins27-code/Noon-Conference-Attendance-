import express from "express";
import { getJSON, setJSON } from "../store.js";
import { requireOrganizer } from "../auth.js";
import { getOrCreateConference } from "./conferences.js";
import { todayDateString, nowIso } from "../time.js";
import { normalizeSession, checkinsKey } from "../sessions.js";

const router = express.Router();

async function getCheckins(date, session) {
  return (await getJSON(checkinsKey(date, session))) || [];
}

function summarize(conf, checkins) {
  return {
    date: conf.date,
    session: conf.session,
    topic: conf.topic,
    presenter: conf.presenter,
    count: checkins.length,
    checkins,
  };
}

// Public: submit a check-in. Code is validated server-side; client value is never trusted.
router.post("/", async (req, res) => {
  const { resident_name, pgy_level, code, date, session } = req.body || {};
  const confDate = date || todayDateString();

  if (!resident_name || !resident_name.trim()) {
    return res.status(400).json({ error: "Please select or enter your name." });
  }
  if (!code || !code.trim()) {
    return res.status(400).json({ error: "Please enter today's check-in code." });
  }

  let s;
  try {
    s = normalizeSession(session);
  } catch {
    return res.status(400).json({ error: "Invalid conference session." });
  }

  const conf = await getOrCreateConference(confDate, s);

  if (code.trim().toUpperCase() !== conf.check_in_code.toUpperCase()) {
    return res.status(403).json({ error: "Incorrect check-in code. Please try again." });
  }

  const checkins = await getCheckins(conf.date, conf.session);
  const name = resident_name.trim();
  if (checkins.some((c) => c.resident_name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: "You have already checked in for this conference." });
  }

  const entry = { resident_name: name, pgy_level: pgy_level || null, timestamp: nowIso() };
  checkins.push(entry);
  await setJSON(checkinsKey(conf.date, conf.session), checkins);

  res.status(201).json({ ...entry, date: conf.date, session: conf.session });
});

// Public: list of who has checked in for a session today (no codes exposed).
router.get("/today", async (req, res) => {
  const date = req.query.date || todayDateString();
  const session = normalizeSession(req.query.session);
  const conf = await getOrCreateConference(date, session);
  const checkins = await getCheckins(conf.date, conf.session);
  res.json(summarize(conf, checkins));
});

// Organizer: full attendance list for a date/session (gated for symmetry/future fields).
router.get("/", requireOrganizer, async (req, res) => {
  const date = req.query.date || todayDateString();
  const session = normalizeSession(req.query.session);
  const conf = await getOrCreateConference(date, session);
  const checkins = await getCheckins(conf.date, conf.session);
  res.json(summarize(conf, checkins));
});

export default router;
