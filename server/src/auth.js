export function requireOrganizer(req, res, next) {
  const passcode = req.header("x-organizer-passcode") || req.body?.passcode;
  if (!passcode || passcode !== process.env.ORGANIZER_PASSCODE) {
    return res.status(401).json({ error: "Invalid or missing organizer passcode." });
  }
  next();
}
