import express from "express";
import { db } from "../db.js";
import { requireOrganizer } from "../auth.js";

const router = express.Router();

// Public: list active residents for the check-in roster picker.
router.get("/", async (req, res) => {
  const result = await db.execute(
    "SELECT id, name, pgy_level FROM residents WHERE active = 1 ORDER BY name COLLATE NOCASE"
  );
  res.json(result.rows);
});

// Organizer: add a resident.
router.post("/", requireOrganizer, async (req, res) => {
  const { name, pgy_level } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required." });
  }
  try {
    const result = await db.execute({
      sql: "INSERT INTO residents (name, pgy_level, active) VALUES (?, ?, 1)",
      args: [name.trim(), pgy_level || null],
    });
    res.status(201).json({
      id: Number(result.lastInsertRowid),
      name: name.trim(),
      pgy_level: pgy_level || null,
    });
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "A resident with this name already exists." });
    }
    throw err;
  }
});

// Organizer: edit a resident.
router.put("/:id", requireOrganizer, async (req, res) => {
  const { name, pgy_level, active } = req.body || {};
  const existingResult = await db.execute({
    sql: "SELECT * FROM residents WHERE id = ?",
    args: [req.params.id],
  });
  const existing = existingResult.rows[0];
  if (!existing) return res.status(404).json({ error: "Resident not found." });

  await db.execute({
    sql: "UPDATE residents SET name = ?, pgy_level = ?, active = ? WHERE id = ?",
    args: [
      name?.trim() || existing.name,
      pgy_level !== undefined ? pgy_level : existing.pgy_level,
      active !== undefined ? (active ? 1 : 0) : existing.active,
      req.params.id,
    ],
  });
  const updated = await db.execute({
    sql: "SELECT * FROM residents WHERE id = ?",
    args: [req.params.id],
  });
  res.json(updated.rows[0]);
});

// Organizer: remove a resident (soft delete to preserve historical check-ins).
router.delete("/:id", requireOrganizer, async (req, res) => {
  const existingResult = await db.execute({
    sql: "SELECT * FROM residents WHERE id = ?",
    args: [req.params.id],
  });
  if (!existingResult.rows[0]) return res.status(404).json({ error: "Resident not found." });
  await db.execute({ sql: "UPDATE residents SET active = 0 WHERE id = ?", args: [req.params.id] });
  res.json({ ok: true });
});

export default router;
