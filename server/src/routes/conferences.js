import express from "express";
import { getJSON, setJSON } from "../store.js";
import { requireOrganizer } from "../auth.js";
import { generateCheckInCode } from "../code.js";
import { todayDateString } from "../time.js";

const router = express.Router();

async function getOrCreateConference(date) {
  let conf = await getJSON(`conference:${date}`);
  if (!conf) {
    conf = { date, topic: "", check_in_code: generateCheckInCode() };
    await setJSON(`conference:${date}`, conf);
  }
  return conf;
}

// Public: today's conference info WITHOUT the code (date, topic only).
router.get("/today", async (req, res) => {
  const date = todayDateString();
  const conf = await getOrCreateConference(date);
  res.json({ date: conf.date, topic: conf.topic });
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
  conf.topic = topic || "";
  await setJSON(`conference:${conf.date}`, conf);
  res.json(conf);
});

// Organizer: regenerate the code for a date, invalidating the previous one.
router.post("/:date/regenerate-code", requireOrganizer, async (req, res) => {
  const conf = await getOrCreateConference(req.params.date);
  conf.check_in_code = generateCheckInCode();
  await setJSON(`conference:${conf.date}`, conf);
  res.json(conf);
});

export { getOrCreateConference };
export default router;
