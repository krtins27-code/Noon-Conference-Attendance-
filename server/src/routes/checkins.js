import express from "express";
import { getJSON, setJSON } from "../store.js";
import { requireOrganizer } from "../auth.js";
import { getOrCreateConference } from "./conferences.js";
import { todayDateString, nowIso } from "../time.js";

const router = express.Router();

async function getCheckins(date) {
  return (await getJSON(`checkins:${date}`)) || [];
}

// Public: submit a check-in. Code is validated server-side; client value is never trusted.
router.post("/", async (req, res) => {
  const { resident_name, pgy_level, code, date } = req.body || {};
  const confDate = date || todayDateString();

  if (!resident_name || !resident_name.trim()) {
    return res.status(400).json({ error: "Please select or enter your name." });
  }
  if (!code || !code.trim()) {
    return res.status(400).json({ error: "Please enter today's check-in code." });
  }

  const conf = await getOrCreateConference(confDate);

  if (code.trim().toUpperCase() !== conf.check_in_code.toUpperCase()) {
    return res.status(403).json({ error: "Incorrect check-in code. Please try again." });
  }

  const checkins = await getCheckins(conf.date);
  const name = resident_name.trim();
  if (checkins.some((c) => c.resident_name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: "You have already checked in for today's conference." });
  }

  const entry = { resident_name: name, pgy_level: pgy_level || null, timestamp: nowIso() };
  checkins.push(entry);
  await setJSON(`checkins:${conf.date}`, checkins);

  res.status(201).json({ ...entry, date: conf.date });
});

// Public: list of who has checked in today (no codes exposed).
router.get("/today", async (req, res) => {
  const date = req.query.date || todayDateString();
  const conf = await getOrCreateConference(date);
  const checkins = await getCheckins(conf.date);
  res.json({ date: conf.date, topic: conf.topic, count: checkins.length, checkins });
});

// Organizer: full attendance list for a date (same shape, gated for symmetry/future fields).
router.get("/", requireOrganizer, async (req, res) => {
  const date = req.query.date || todayDateString();
  const conf = await getOrCreateConference(date);
  const checkins = await getCheckins(conf.date);
  res.json({ date: conf.date, topic: conf.topic, count: checkins.length, checkins });
});

export default router;
