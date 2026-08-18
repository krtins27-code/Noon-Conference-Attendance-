import { test } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { buildAttendanceXlsx } from "./report.js";

test("xlsx includes Session and Presenter and the check-in rows", () => {
  const buffer = buildAttendanceXlsx({
    date: "2026-08-18",
    session: "morning",
    topic: "Sepsis Bundles",
    presenter: "Dr. Ng",
    checkins: [{ resident_name: "Amy Chen", pgy_level: "PGY-2", timestamp: "2026-08-18T08:05:00-04:00" }],
  });
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 0);

  const wb = XLSX.read(buffer, { type: "buffer" });
  assert.ok(wb.SheetNames.includes("Morning Attendance"));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Morning Attendance"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].Session, "Morning");
  assert.equal(rows[0].Presenter, "Dr. Ng");
  assert.equal(rows[0].Name, "Amy Chen");
});
