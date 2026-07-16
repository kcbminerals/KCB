import "server-only";
import { createClient, type InValue } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";

const isRemote = Boolean(process.env.TURSO_DATABASE_URL);

if (!isRemote) {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

declare global {
  var __kcbDb: ReturnType<typeof createClient> | undefined;
  var __kcbMigrated: Promise<void> | undefined;
}

function createConnection() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./data/app.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

export const db = globalThis.__kcbDb ?? createConnection();
if (process.env.NODE_ENV !== "production") {
  globalThis.__kcbDb = db;
}

async function migrate() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS distributors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      price_per_jar REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      plate_number TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      distributor_id INTEGER NOT NULL REFERENCES distributors(id),
      vehicle_id INTEGER REFERENCES vehicles(id),
      jars_loaded INTEGER NOT NULL DEFAULT 0,
      jars_returned INTEGER NOT NULL DEFAULT 0,
      price_per_jar REAL NOT NULL DEFAULT 0,
      bill_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      distributor_id INTEGER NOT NULL REFERENCES distributors(id),
      amount REAL NOT NULL DEFAULT 0,
      method TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(date);
    CREATE INDEX IF NOT EXISTS idx_deliveries_distributor ON deliveries(distributor_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
    CREATE INDEX IF NOT EXISTS idx_payments_distributor ON payments(distributor_id);
  `);

  const defaultPassword = "kcb1234";
  const hash = bcrypt.hashSync(defaultPassword, 10);
  const seeded = await db.execute({
    sql: `INSERT INTO users (username, password_hash, name)
          SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM users)`,
    args: ["admin", hash, "Admin"],
  });
  if (seeded.rowsAffected > 0) {
    console.log(
      `[kcb] Created default login -> username: admin, password: ${defaultPassword} (please change it after first login)`
    );
  }
}

export function ensureMigrated(): Promise<void> {
  if (!globalThis.__kcbMigrated) {
    globalThis.__kcbMigrated = migrate();
  }
  return globalThis.__kcbMigrated;
}

/** Run a SELECT and return all matching rows, plainly typed. */
export async function dbAll<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  await ensureMigrated();
  const result = await db.execute({ sql, args });
  return result.rows.map((row) => ({ ...row }) as unknown as T);
}

/** Run a SELECT and return the first matching row, if any. */
export async function dbGet<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  const rows = await dbAll<T>(sql, args);
  return rows[0];
}

/** Run an INSERT/UPDATE/DELETE and return affected-row info. */
export async function dbRun(
  sql: string,
  args: InValue[] = []
): Promise<{ lastInsertRowid: number; changes: number }> {
  await ensureMigrated();
  const result = await db.execute({ sql, args });
  return {
    lastInsertRowid: Number(result.lastInsertRowid ?? 0),
    changes: result.rowsAffected,
  };
}
