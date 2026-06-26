import * as XLSX from "xlsx";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { formatDisplayDate, formatDisplayTime } from "./time.js";

// @sparticuz/chromium-min ships no binary itself; it downloads a brotli-compressed
// Chromium build from this pack URL at runtime and caches it in /tmp. This keeps the
// deployed function small enough for Netlify/Lambda and works the same way locally.
const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ||
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

const PROGRAM_NAME = process.env.PROGRAM_NAME || "Noon Conference";

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
  worksheet["!cols"] = [{ wch: 24 }, { wch: 8 }, { wch: 16 }, { wch: 30 }, { wch: 14 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function buildAttendanceHtml({ date, topic, checkins }) {
  const displayDate = formatDisplayDate(date);
  const rowsHtml = checkins
    .map(
      (c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(c.resident_name)}</td>
        <td>${escapeHtml(c.pgy_level || "")}</td>
        <td>${escapeHtml(formatDisplayTime(c.timestamp))}</td>
      </tr>`
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 32px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      .meta { font-size: 13px; color: #444; margin-bottom: 2px; }
      .meta strong { color: #111; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
      th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
      th { background: #f0f4f8; }
      tr:nth-child(even) { background: #fafafa; }
      .footer { margin-top: 16px; font-size: 12px; color: #666; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(PROGRAM_NAME)} &mdash; Attendance Report</h1>
    <div class="meta"><strong>Date:</strong> ${escapeHtml(displayDate)}</div>
    <div class="meta"><strong>Topic:</strong> ${escapeHtml(topic || "(none)")}</div>
    <div class="meta"><strong>Total Present:</strong> ${checkins.length}</div>
    <table>
      <thead>
        <tr><th>#</th><th>Name</th><th>PGY</th><th>Check-in Time</th></tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="4">No check-ins recorded.</td></tr>`}
      </tbody>
    </table>
    <div class="footer">Generated ${escapeHtml(new Date().toLocaleString())}</div>
  </body>
  </html>`;
}

export async function buildAttendancePdf(data) {
  const html = buildAttendanceHtml(data);
  const executablePath = await chromium.executablePath(CHROMIUM_PACK_URL);
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: chromium.headless,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "Letter", margin: { top: "20px", bottom: "20px" } });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
