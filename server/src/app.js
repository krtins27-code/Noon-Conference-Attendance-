import "dotenv/config";
import express from "express";
import cors from "cors";
import { ensureSchema } from "./db.js";

import conferencesRouter from "./routes/conferences.js";
import checkinsRouter from "./routes/checkins.js";
import reportRouter from "./routes/report.js";

export async function createApp() {
  await ensureSchema();

  const app = express();
  app.use(cors({ origin: process.env.WEB_ORIGIN || "*" }));
  app.use(express.json());

  // When invoked behind the Netlify redirect (/api/* -> /.netlify/functions/api/:splat),
  // the function sees the full rewritten path. Strip that prefix so routes below
  // (mounted at /api/...) work identically locally and on Netlify.
  app.use((req, res, next) => {
    if (req.url.startsWith("/.netlify/functions/api")) {
      req.url = req.url.replace("/.netlify/functions/api", "") || "/";
    }
    next();
  });

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.use("/api/conferences", conferencesRouter);
  app.use("/api/checkins", checkinsRouter);
  app.use("/api/report", reportRouter);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}
