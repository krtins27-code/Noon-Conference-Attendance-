import { createClient } from "@libsql/client";

// Local dev: a plain SQLite file (no account needed). Production (Netlify): a
// hosted Turso (libsql) database, since serverless functions have no
// persistent local filesystem. Same SQL works against both.
const url = process.env.TURSO_DATABASE_URL || "file:./data/attendance.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient(authToken ? { url, authToken } : { url });

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS residents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    pgy_level TEXT,
    active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS conferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    topic TEXT DEFAULT '',
    check_in_code TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conference_id INTEGER NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
    resident_name TEXT NOT NULL,
    pgy_level TEXT,
    timestamp TEXT NOT NULL,
    UNIQUE(conference_id, resident_name)
  )`,
];

let schemaReady;

// Idempotent + cached so repeated calls (every request, every cold start) are cheap.
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const sql of SCHEMA_STATEMENTS) {
        await db.execute(sql);
      }
    })();
  }
  return schemaReady;
}
