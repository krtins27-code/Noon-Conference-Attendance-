import express from "express";
import { getJSON, setJSON } from "../store.js";
import { requireOrganizer } from "../auth.js";
import { generateCheckInCode } from "../code.js";
import { todayDateString } from "../time.js";
import {
  normalizeSession,
  confKey,
  checkinsKey,
  legacyConfKey,
  legacyCheckinsKey,
  DEFAULT_SESSION,
} from "../sessions.js";

const router = express.Router();

// Load (or create) the conference for a given date + session.
//
// Backfill: pre-split data was keyed by date alone. The first time the Noon
// session for a date is touched, any legacy date-only conference (and its
// check-ins) is adopted into the noon key, preserving the original code and
// attendance. Legacy keys are left untouched.
async function getOrCreateConference(date, session) {
  const s = normalizeSession(session);
  const key = confKey(date, s);
  let conf = await getJSON(key);

  if (!conf && s === DEFAULT_SESSION) {
    const legacy = await getJSON(legacyConfKey(date));
    if (legacy) {
      conf = {
        date,
        session: s,
        topic: legacy.topic || "",
        presenter: legacy.presenter || "",
        check_in_code: legacy.check_in_code || generateCheckInCode(),
      };
      await setJSON(key, conf);
      const legacyCheckins = await getJSON(legacyCheckinsKey(date));
      if (legacyCheckins && !(await getJSON(checkinsKey(date, s)))) {
        await setJSON(checkinsKey(date, s), legacyCheckins);
      }
      return conf;
    }
  }

  if (!conf) {
    conf = { date, session: s, topic: "", presenter: "", check_in_code: generateCheckInCode() };
    await setJSON(key, conf);
    return conf;
  }

  // Backfill fields on objects created before this schema.
  let changed = false;
  if (conf.session !== s) { conf.session = s; changed = true; }
  if (conf.presenter === undefined) { conf.presenter = ""; changed = true; }
  if (changed) await setJSON(key, conf);
  return conf;
}

// Public: today's conference info WITHOUT the code (date, session, topic, presenter).
router.get("/today", async (req, res) => {
  const session = normalizeSession(req.query.session);
  const conf = await getOrCreateConference(todayDateString(), session);
  res.json({ date: conf.date, session: conf.session, topic: conf.topic, presenter: conf.presenter });
});

// Organizer: today's (or a given date's) conference INCLUDING the code.
router.get("/today/organizer", requireOrganizer, async (req, res) => {
  const date = req.query.date || todayDateString();
  const session = normalizeSession(req.query.session);
  const conf = await getOrCreateConference(date, session);
  res.json(conf);
});

// Organizer: set topic + presenter for a date/session.
router.put("/:date/details", requireOrganizer, async (req, res) => {
  const { topic, presenter, session } = req.body || {};
  const conf = await getOrCreateConference(req.params.date, session);
  conf.topic = topic || "";
  conf.presenter = presenter || "";
  await setJSON(confKey(conf.date, conf.session), conf);
  res.json(conf);
});

// Organizer: regenerate the code for a date/session, invalidating the previous one.
router.post("/:date/regenerate-code", requireOrganizer, async (req, res) => {
  const { session } = req.body || {};
  const conf = await getOrCreateConference(req.params.date, session);
  conf.check_in_code = generateCheckInCode();
  await setJSON(confKey(conf.date, conf.session), conf);
  res.json(conf);
});

export { getOrCreateConference };
export default router;
