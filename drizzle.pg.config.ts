// drizzle.pg.config.ts
// Postgres-side config used by db:push:pg / db:generate:pg. The existing
// drizzle.config.ts (SQLite) is left untouched until later phases complete.

import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.pg.ts",
  out: "./drizzle/pg",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/csc_billing",
  },
} satisfies Config;
