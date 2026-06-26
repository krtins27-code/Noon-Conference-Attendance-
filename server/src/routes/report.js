import express from "express";
import { db } from "../db.js";
import { requireOrganizer } from "../auth.js";
import { getOrCreateConference } from "./conferences.js";
import { todayDateString } from "../time.js";
import { buildAttendanceXlsx } from "../report.js";

const router = express.Router();

async function loadAttendance(date) {
  const conf = await getOrCreateConference(date);
  const result = await db.execute({
    sql: "SELECT resident_name, pgy_level, timestamp FROM checkins WHERE conference_id = ? ORDER BY timestamp ASC",
    args: [conf.id],
  });
  return { date: conf.date, topic: conf.topic, checkins: result.rows };
}

// Organizer: generate and download the attendance report as an .xlsx file.
router.get("/xlsx", requireOrganizer, async (req, res) => {
  const date = req.query.date || todayDateString();
  const data = await loadAttendance(date);
  const buffer = buildAttendanceXlsx(data);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="attendance-${date}.xlsx"`);
  res.send(buffer);
});

export default router;
