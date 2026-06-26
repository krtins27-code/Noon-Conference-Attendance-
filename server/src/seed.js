import { db, ensureSchema } from "./db.js";

const residents = [
  { name: "Aisha Khan", pgy_level: "PGY-1" },
  { name: "Brian O'Connor", pgy_level: "PGY-1" },
  { name: "Carla Mendez", pgy_level: "PGY-2" },
  { name: "David Park", pgy_level: "PGY-2" },
  { name: "Emily Stone", pgy_level: "PGY-3" },
  { name: "Farid Haidari", pgy_level: "PGY-3" },
];

await ensureSchema();

for (const r of residents) {
  await db.execute({
    sql: "INSERT OR IGNORE INTO residents (name, pgy_level, active) VALUES (?, ?, 1)",
    args: [r.name, r.pgy_level],
  });
}

console.log(`Seeded ${residents.length} example residents.`);
