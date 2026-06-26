import express from "express";
import { db } from "../db.js";
import { requireOrganizer } from "../auth.js";
import { getOrCreateConference } from "./conferences.js";
import { todayDateString } from "../time.js";
import { buildAttendanceXlsx, buildAttendancePdf } from "../report.js";
import { sendAttendanceReportEmail } from "../email.js";

const router = express.Router();

async function loadAttendance(date) {
  const conf = await getOrCreateConference(date);
  const result = await db.execute({
    sql: "SELECT resident_name, pgy_level, timestamp FROM checkins WHERE conference_id = ? ORDER BY timestamp ASC",
    args: [conf.id],
  });
  return { date: conf.date, topic: conf.topic, checkins: result.rows };
}

// Organizer: generate the report files without emailing (download).
router.get("/xlsx", requireOrganizer, async (req, res) => {
  const date = req.query.date || todayDateString();
  const data = await loadAttendance(date);
  const buffer = buildAttendanceXlsx(data);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="attendance-${date}.xlsx"`);
  res.send(buffer);
});

router.get("/pdf", requireOrganizer, async (req, res) => {
  const date = req.query.date || todayDateString();
  const data = await loadAttendance(date);
  const buffer = await buildAttendancePdf(data);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="attendance-${date}.pdf"`);
  res.send(buffer);
});

// Organizer: generate xlsx + pdf and email both to the configured recipient.
router.post("/send", requireOrganizer, async (req, res) => {
  const date = req.body?.date || todayDateString();
  const data = await loadAttendance(date);

  const xlsxBuffer = buildAttendanceXlsx(data);
  const pdfBuffer = await buildAttendancePdf(data);

  await sendAttendanceReportEmail({
    date: data.date,
    topic: data.topic,
    count: data.checkins.length,
    pdfBuffer,
    xlsxBuffer,
  });

  res.json({ ok: true, count: data.checkins.length, date: data.date, topic: data.topic });
});

export default router;
