import * as XLSX from "xlsx";
import { formatDisplayTime } from "./time.js";

export function buildAttendanceXlsx({ date, topic, checkins }) {
  const rows = checkins.map((c) => ({
    Name: c.resident_name,
    PGY: c.pgy_level || "",
    "Conference Date": date,
    Topic: topic || "",
    "Check-in Time": formatDisplayTime(c.timestamp),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ["Name", "PGY", "Conference Date", "Topic", "Check-in Time"],
  });
  worksheet["!cols"] = [{ wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 30 }, { wch: 14 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
