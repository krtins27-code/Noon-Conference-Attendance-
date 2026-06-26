import nodemailer from "nodemailer";
import { formatDisplayDate } from "./time.js";

const PROGRAM_NAME = process.env.PROGRAM_NAME || "Noon Conference";

function buildTransportAndFrom() {
  if (process.env.RESEND_API_KEY) {
    // Resend exposes an SMTP-compatible endpoint, so nodemailer works directly.
    return {
      transporter: nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: { user: "resend", pass: process.env.RESEND_API_KEY },
      }),
      from: process.env.EMAIL_FROM || "Noon Conference <onboarding@resend.dev>",
    };
  }

  if (process.env.SMTP_HOST) {
    return {
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      }),
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    };
  }

  throw new Error(
    "No email transport configured. Set RESEND_API_KEY or SMTP_HOST in your environment."
  );
}

export async function sendAttendanceReportEmail({ date, topic, count, pdfBuffer, xlsxBuffer }) {
  const { transporter, from } = buildTransportAndFrom();
  const recipient = process.env.REPORT_RECIPIENT || "KSinghal@bhmcny.org";
  const displayDate = formatDisplayDate(date);
  const subject = `Noon Conference Attendance, ${displayDate}, ${topic || "No Topic"}`;

  const html = `
    <p>Attached is the attendance report for <strong>${displayDate}</strong>${
    topic ? ` &mdash; <strong>${topic}</strong>` : ""
  }.</p>
    <p><strong>Total present:</strong> ${count}</p>
    <p>This email was generated automatically by the ${PROGRAM_NAME} attendance app.</p>
  `;

  await transporter.sendMail({
    from,
    to: recipient,
    subject,
    html,
    attachments: [
      {
        filename: `attendance-${date}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
      {
        filename: `attendance-${date}.xlsx`,
        content: xlsxBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });
}
