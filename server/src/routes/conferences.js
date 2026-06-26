import express from "express";
import { db } from "../db.js";
import { requireOrganizer } from "../auth.js";
import { generateCheckInCode } from "../code.js";
import { todayDateString } from "../time.js";

const router = express.Router();

async function getOrCreateConference(date) {
  const existing = await db.execute({ sql: "SELECT * FROM conferences WHERE date = ?", args: [date] });
  if (existing.rows[0]) return existing.rows[0];

  const code = generateCheckInCode();
  const result = await db.execute({
    sql: "INSERT INTO conferences (date, topic, check_in_code) VALUES (?, '', ?)",
    args: [date, code],
  });
  const created = await db.execute({
    sql: "SELECT * FROM conferences WHERE id = ?",
    args: [Number(result.lastInsertRowid)],
  });
  return created.rows[0];
}

// Public: today's conference info WITHOUT the code (date, topic only).
router.get("/today", async (req, res) => {
  const date = todayDateString();
  const conf = await getOrCreateConference(date);
  res.json({ id: conf.id, date: conf.date, topic: conf.topic });
});

// Organizer: today's (or a given date's) conference INCLUDING the code.
router.get("/today/organizer", requireOrganizer, async (req, res) => {
  const date = req.query.date || todayDateString();
  const conf = await getOrCreateConference(date);
  res.json(conf);
});

// Organizer: set topic for a date.
router.put("/:date/topic", requireOrganizer, async (req, res) => {
  const { topic } = req.body || {};
  const conf = await getOrCreateConference(req.params.date);
  await db.execute({ sql: "UPDATE conferences SET topic = ? WHERE id = ?", args: [topic || "", conf.id] });
  const updated = await db.execute({ sql: "SELECT * FROM conferences WHERE id = ?", args: [conf.id] });
  res.json(updated.rows[0]);
});

// Organizer: regenerate the code for a date, invalidating the previous one.
router.post("/:date/regenerate-code", requireOrganizer, async (req, res) => {
  const conf = await getOrCreateConference(req.params.date);
  const code = generateCheckInCode();
  await db.execute({ sql: "UPDATE conferences SET check_in_code = ? WHERE id = ?", args: [code, conf.id] });
  const updated = await db.execute({ sql: "SELECT * FROM conferences WHERE id = ?", args: [conf.id] });
  res.json(updated.rows[0]);
});

export { getOrCreateConference };
export default router;
