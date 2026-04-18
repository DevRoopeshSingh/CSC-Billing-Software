// src/db/index.ts
import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let sqlite: Database.Database | null = null;
let db: BetterSQLite3Database<typeof schema> | null = null;

/**
 * Initialize the database connection. Call once from the Electron main process.
 * @param dbPath - Absolute path to the SQLite database file
 */
export function initDatabase(dbPath: string) {
  sqlite = new Database(dbPath);

  // Performance pragmas for desktop use
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  db = drizzle(sqlite, { schema });
  return db;
}

/** Get the active Drizzle database instance. Throws if not initialized. */
export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    throw new Error(
      "Database not initialized. Call initDatabase(path) from the main process first."
    );
  }
  return db;
}

/** Get the raw better-sqlite3 instance (for backups, VACUUM, etc.). */
export function getSqlite(): Database.Database {
  if (!sqlite) {
    throw new Error("Database not initialized.");
  }
  return sqlite;
}

/** Close the database connection cleanly. Call on app quit. */
export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

export { schema };
