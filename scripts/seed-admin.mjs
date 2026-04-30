// scripts/seed-admin.mjs
// One-shot seed: create (or reset) an admin user with credentials
//   username:  admin
//   password:  admin123
//   admin PIN: 123456   (only set if no PIN already exists)
//
// Usage: `node scripts/seed-admin.mjs`
//
// Resolves the same SQLite path Electron uses (app.getPath("userData") on the
// host OS), creates the file with the schema if missing, then inserts or
// updates the admin row. Safe to re-run.

import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const PRODUCT_NAME = "csc-center-billing-software";

function resolveUserDataPath() {
  switch (process.platform) {
    case "darwin":
      return path.join(os.homedir(), "Library", "Application Support", PRODUCT_NAME);
    case "win32":
      return path.join(
        process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"),
        PRODUCT_NAME
      );
    default:
      return path.join(
        process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"),
        PRODUCT_NAME
      );
  }
}

const userDataPath = resolveUserDataPath();
const dbPath = path.join(userDataPath, "csc_billing.db");
fs.mkdirSync(userDataPath, { recursive: true });

console.log(`[seed-admin] Using DB at ${dbPath}`);
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Make sure the tables exist (matches the bootstrap in src/main/index.ts).
db.exec(`
  CREATE TABLE IF NOT EXISTS center_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    center_name TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    mobile TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    udyam_number TEXT NOT NULL DEFAULT '',
    logo_path TEXT,
    upi_qr_path TEXT,
    upi_id TEXT,
    invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
    invoice_number INTEGER NOT NULL DEFAULT 0,
    theme TEXT NOT NULL DEFAULT 'light',
    default_tax_rate REAL NOT NULL DEFAULT 0,
    default_payment_mode TEXT NOT NULL DEFAULT 'Cash',
    last_backup_date INTEGER,
    pin_hash TEXT,
    operating_hours TEXT NOT NULL DEFAULT '',
    center_description TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );
`);

const profileCount = db
  .prepare("SELECT COUNT(*) AS count FROM center_profiles")
  .get();
if (profileCount.count === 0) {
  db.prepare("INSERT INTO center_profiles DEFAULT VALUES").run();
  console.log("[seed-admin] Created default center_profiles row.");
}

const passwordHash = bcrypt.hashSync("admin123", 12);
const now = Date.now();

const existing = db
  .prepare("SELECT id FROM users WHERE username = ?")
  .get("admin");
if (existing) {
  db.prepare(
    `UPDATE users
       SET password_hash = ?, role = 'admin', is_active = 1
     WHERE id = ?`
  ).run(passwordHash, existing.id);
  console.log("[seed-admin] Updated existing 'admin' user.");
} else {
  db.prepare(
    `INSERT INTO users (username, email, password_hash, role, is_active, created_at)
     VALUES (?, NULL, ?, 'admin', 1, ?)`
  ).run("admin", passwordHash, now);
  console.log("[seed-admin] Created 'admin' user.");
}

const profile = db
  .prepare("SELECT pin_hash FROM center_profiles WHERE id = 1")
  .get();
if (!profile?.pin_hash) {
  const pinHash = bcrypt.hashSync("123456", 12);
  db.prepare(
    "UPDATE center_profiles SET pin_hash = ? WHERE id = 1"
  ).run(pinHash);
  console.log(
    "[seed-admin] Set default Admin PIN to 123456 (rotate via Settings → Security)."
  );
} else {
  console.log("[seed-admin] Admin PIN already set — left untouched.");
}

db.close();

console.log("");
console.log("Done. Sign in with:");
console.log("  Username: admin");
console.log("  Password: admin123");
console.log("");
console.log("Forgot-password reset uses the global Admin PIN (123456 if seeded above).");
