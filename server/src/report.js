import * as XLSX from "xlsx";
import { formatDisplayTime } from "./time.js";

const SESSION_LABELS = { morning: "Morning", noon: "Noon" };

export function buildAttendanceXlsx({ date, session, topic, presenter, checkins }) {
  const sessionLabel = SESSION_LABELS[session] || "Noon";
  const rows = checkins.map((c) => ({
    Name: c.resident_name,
    PGY: c.pgy_level || "",
    "Conference Date": date,
    Session: sessionLabel,
    Topic: topic || "",
    Presenter: presenter || "",
    "Check-in Time": formatDisplayTime(c.timestamp),
  }));

  const header = ["Name", "PGY", "Conference Date", "Session", "Topic", "Presenter", "Check-in Time"];
  const worksheet = XLSX.utils.json_to_sheet(rows, { header });
  worksheet["!cols"] = [
    { wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 30 }, { wch: 24 }, { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${sessionLabel} Attendance`.slice(0, 31));

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
