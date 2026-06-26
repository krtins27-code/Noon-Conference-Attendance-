import { getStore } from "@netlify/blobs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_FILE = path.join(__dirname, "..", "data", "store.json");

// On Netlify, getStore() works with zero configuration — the platform injects
// the credentials a deployed function needs automatically. There's no separate
// database account to create. For local dev (plain `node src/index.js`, no
// Netlify context available), we fall back to a single JSON file on disk so
// development still needs no account either.
let mode;
let blobStore;

async function detectMode() {
  if (mode) return mode;
  try {
    blobStore = getStore("attendance");
    await blobStore.get("__probe__");
    mode = "blobs";
  } catch {
    mode = "local";
  }
  return mode;
}

async function readLocalFile() {
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeLocalFile(data) {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(data, null, 2));
}

// Local-file mode does read-modify-write on one shared file; this queue
// serializes those operations so concurrent requests don't race each other.
let queue = Promise.resolve();
function serialized(fn) {
  const result = queue.then(fn, fn);
  queue = result.then(
    () => {},
    () => {}
  );
  return result;
}

export async function getJSON(key) {
  const m = await detectMode();
  if (m === "blobs") {
    return blobStore.get(key, { type: "json" });
  }
  return serialized(async () => {
    const data = await readLocalFile();
    return data[key] ?? null;
  });
}

export async function setJSON(key, value) {
  const m = await detectMode();
  if (m === "blobs") {
    await blobStore.set(key, JSON.stringify(value));
    return;
  }
  return serialized(async () => {
    const data = await readLocalFile();
    data[key] = value;
    await writeLocalFile(data);
  });
}
