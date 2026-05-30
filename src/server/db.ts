// src/server/db.ts
// Lazy Postgres connection used by every Route Handler. Process-singleton: one
// connection pool per Node process, reused across requests. Works against any
// Postgres (local docker, Neon's pg endpoint, RDS) via DATABASE_URL.

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema.pg";

declare global {
  var __pg: ReturnType<typeof postgres> | undefined;
  var __db: PostgresJsDatabase<typeof schema> | undefined;
  var __pgRo: ReturnType<typeof postgres> | undefined;
  var __dbRo: PostgresJsDatabase<typeof schema> | undefined;
}

function buildClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  // `max: 10` keeps us inside Neon's free-tier connection cap; raise per host.
  // `prepare: false` because Neon's pooled endpoint doesn't support PREPARE.
  return postgres(url, { max: 10, prepare: false });
}

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!globalThis.__db) {
    globalThis.__pg = buildClient();
    globalThis.__db = drizzle(globalThis.__pg, { schema });
  }
  return globalThis.__db;
}

export function getReadOnlyDb(): PostgresJsDatabase<typeof schema> {
  if (!globalThis.__dbRo) {
    const url = process.env.SUPABASE_READONLY_URL || process.env.DATABASE_URL;
    if (!url) {
      throw new Error("SUPABASE_READONLY_URL or DATABASE_URL is not set");
    }
    globalThis.__pgRo = postgres(url, { max: 10, prepare: false });
    globalThis.__dbRo = drizzle(globalThis.__pgRo, { schema });
  }
  return globalThis.__dbRo;
}

export { schema };
