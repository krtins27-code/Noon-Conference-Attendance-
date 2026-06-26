import express from "express";
import { db } from "../db.js";
import { requireOrganizer } from "../auth.js";
import { getOrCreateConference } from "./conferences.js";
import { todayDateString, nowIso } from "../time.js";

const router = express.Router();

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

  const existing = await db.execute({
    sql: "SELECT * FROM checkins WHERE conference_id = ? AND resident_name = ?",
    args: [conf.id, resident_name.trim()],
  });
  if (existing.rows[0]) {
    return res.status(409).json({ error: "You have already checked in for today's conference." });
  }

  const timestamp = nowIso();
  const result = await db.execute({
    sql: "INSERT INTO checkins (conference_id, resident_name, pgy_level, timestamp) VALUES (?, ?, ?, ?)",
    args: [conf.id, resident_name.trim(), pgy_level || null, timestamp],
  });

  res.status(201).json({
    id: Number(result.lastInsertRowid),
    resident_name: resident_name.trim(),
    pgy_level: pgy_level || null,
    timestamp,
    date: conf.date,
  });
});

// Public: list of who has checked in today (no codes exposed).
router.get("/today", async (req, res) => {
  const date = req.query.date || todayDateString();
  const conf = await getOrCreateConference(date);
  const result = await db.execute({
    sql: "SELECT resident_name, pgy_level, timestamp FROM checkins WHERE conference_id = ? ORDER BY timestamp ASC",
    args: [conf.id],
  });
  res.json({ date: conf.date, topic: conf.topic, count: result.rows.length, checkins: result.rows });
});

// Organizer: full attendance list for a date (same shape, gated for symmetry/future fields).
router.get("/", requireOrganizer, async (req, res) => {
  const date = req.query.date || todayDateString();
  const conf = await getOrCreateConference(date);
  const result = await db.execute({
    sql: "SELECT id, resident_name, pgy_level, timestamp FROM checkins WHERE conference_id = ? ORDER BY timestamp ASC",
    args: [conf.id],
  });
  res.json({ date: conf.date, topic: conf.topic, count: result.rows.length, checkins: result.rows });
});

export default router;
