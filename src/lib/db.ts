import "server-only";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "app.db");

declare global {
  var __kcbDb: Database.Database | undefined;
}

function createConnection() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export const db = globalThis.__kcbDb ?? createConnection();
if (process.env.NODE_ENV !== "production") {
  globalThis.__kcbDb = db;
}

function migrate() {
  db.exec(`
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
  const seeded = db
    .prepare(
      `INSERT INTO users (username, password_hash, name)
       SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM users)`
    )
    .run("admin", hash, "Admin");
  if (seeded.changes > 0) {
    console.log(
      `[kcb] Created default login -> username: admin, password: ${defaultPassword} (please change it after first login)`
    );
  }
}

migrate();
