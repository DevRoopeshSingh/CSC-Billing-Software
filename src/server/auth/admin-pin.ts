// src/server/auth/admin-pin.ts
// Centralised admin-PIN gate. Used by destructive endpoints (delete customer,
// later: delete user, delete invoice, etc.). The PIN is sent in the x-admin-pin
// header — never in a query string or URL — so it doesn't end up in access logs.

import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { verifyPin } from "@/lib/pin";

export async function requireAdminPin(pin: unknown): Promise<void> {
  if (typeof pin !== "string" || pin.length < 4) {
    throw new Error("Admin PIN required for this action.");
  }
  const db = getDb();
  const [profile] = await db
    .select({ pinHash: schema.centerProfiles.pinHash })
    .from(schema.centerProfiles)
    .where(eq(schema.centerProfiles.id, 1))
    .limit(1);
  if (!profile?.pinHash) {
    throw new Error("Admin PIN not configured. Set one in Settings first.");
  }
  const ok = await verifyPin(pin, profile.pinHash);
  if (!ok) throw new Error("Incorrect PIN.");
}
