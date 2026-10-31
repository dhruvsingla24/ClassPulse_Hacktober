import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { DB } from "./types";
import { buildSeed } from "./seed";

// On Vercel the project folder is read-only; /tmp is the only writable place (and it resets on cold starts).
export const DATA_DIR = process.env.CLASSPULSE_DATA_DIR ?? (process.env.VERCEL ? "/tmp/classpulse" : path.join(process.cwd(), "data"));
const FILE = path.join(DATA_DIR, "db.json");

const g = globalThis as unknown as { __cpdb?: DB };

function write(db: DB) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + "." + randomBytes(4).toString("hex") + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, FILE); // atomic replace
}

function load(): DB {
  if (g.__cpdb) return g.__cpdb;
  if (fs.existsSync(FILE)) {
    g.__cpdb = JSON.parse(fs.readFileSync(FILE, "utf8")) as DB;
  } else {
    g.__cpdb = buildSeed();
    write(g.__cpdb);
  }
  return g.__cpdb;
}

/** Read-only access. Never mutate the returned object outside tx(). */
export function db(): DB {
  return load();
}

/**
 * Run a mutation and persist it. Node runs this synchronously on one thread, so a
 * tx() is never interleaved with another one: it behaves like a serialised transaction.
 */
export function tx<T>(fn: (d: DB) => T): T {
  const d = load();
  const out = fn(d);
  write(d);
  return out;
}

export function resetDemo() {
  g.__cpdb = buildSeed();
  write(g.__cpdb);
}

export function uid(prefix = "") {
  return prefix + randomBytes(6).toString("base64url");
}

export function today(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
