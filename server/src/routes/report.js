import express from "express";
import { getJSON } from "../store.js";
import { requireOrganizer } from "../auth.js";
import { getOrCreateConference } from "./conferences.js";
import { todayDateString } from "../time.js";
import { buildAttendanceXlsx } from "../report.js";
import { normalizeSession, checkinsKey } from "../sessions.js";

const router = express.Router();

async function loadAttendance(date, session) {
  const conf = await getOrCreateConference(date, session);
  const checkins = (await getJSON(checkinsKey(conf.date, conf.session))) || [];
  return { date: conf.date, session: conf.session, topic: conf.topic, presenter: conf.presenter, checkins };
}

// Organizer: generate and download the attendance report as an .xlsx file.
router.get("/xlsx", requireOrganizer, async (req, res) => {
  const date = req.query.date || todayDateString();
  const session = normalizeSession(req.query.session);
  const data = await loadAttendance(date, session);
  const buffer = buildAttendanceXlsx(data);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="attendance-${session}-${date}.xlsx"`);
  res.send(buffer);
});

export default router;
