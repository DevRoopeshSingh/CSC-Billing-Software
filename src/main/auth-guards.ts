// src/main/auth-guards.ts
// Server-side enforcement helpers for auth/RBAC.
// Used by IPC handlers to gate destructive ops behind the admin PIN, prevent
// removal of the last admin, and rate-limit login attempts. None of these
// helpers trust client input — every guarantee is enforced in the main process.

import { eq, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../db/schema";
import { getDb } from "../db";

const FAILURES_BEFORE_LOCK = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

interface FailureRecord {
  count: number;
  lockedUntil: number;
}

const loginFailures = new Map<string, FailureRecord>();

export function checkLoginRateLimit(username: string): void {
  const rec = loginFailures.get(username);
  if (!rec) return;
  if (rec.lockedUntil > Date.now()) {
    const secs = Math.ceil((rec.lockedUntil - Date.now()) / 1000);
    throw new Error(
      `Too many failed attempts. Try again in ${secs} second${secs === 1 ? "" : "s"}.`
    );
  }
}

export function recordLoginFailure(username: string): void {
  const rec = loginFailures.get(username) ?? { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= FAILURES_BEFORE_LOCK) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
    rec.count = 0;
  }
  loginFailures.set(username, rec);
}

export function clearLoginFailures(username: string): void {
  loginFailures.delete(username);
}

// Synchronous PIN verification so destructive handlers can validate inside a
// transaction without awaiting. bcryptjs supports compareSync.
export function verifyPinSync(pin: string, hash: string): boolean {
  return bcrypt.compareSync(pin, hash);
}

export function requireAdminPin(pin: unknown): void {
  const db = getDb();
  const profile = db
    .select({ pinHash: schema.centerProfiles.pinHash })
    .from(schema.centerProfiles)
    .where(eq(schema.centerProfiles.id, 1))
    .get();
  if (!profile?.pinHash) {
    throw new Error("Admin PIN not configured. Set one in Settings first.");
  }
  if (typeof pin !== "string" || pin.length < 4) {
    throw new Error("Admin PIN required for this action.");
  }
  if (!verifyPinSync(pin, profile.pinHash)) {
    throw new Error("Incorrect PIN.");
  }
}

// Reject any change that would leave the system without an active admin.
// `change` describes what is about to happen to `targetUserId`; we count the
// remaining active admins as if the change had already been applied.
type PendingChange =
  | { kind: "demote" }
  | { kind: "disable" }
  | { kind: "delete" };

export function assertNotLastAdmin(
  targetUserId: number,
  change: PendingChange
): void {
  const db = getDb();
  const target = db
    .select({ role: schema.users.role, isActive: schema.users.isActive })
    .from(schema.users)
    .where(eq(schema.users.id, targetUserId))
    .get();
  if (!target) throw new Error("User not found");

  // If target isn't currently an active admin, this change can't drop the
  // active-admin count below where it already is.
  if (target.role !== "admin" || !target.isActive) return;

  const row = db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.role, "admin"),
        eq(schema.users.isActive, true)
      )
    )
    .get();
  const activeAdmins = row?.count ?? 0;

  // After the change, the target stops being an active admin (regardless of
  // demote/disable/delete) so the count drops by 1.
  if (activeAdmins - 1 < 1) {
    const verb =
      change.kind === "delete"
        ? "delete"
        : change.kind === "disable"
          ? "disable"
          : "demote";
    throw new Error(`Cannot ${verb} the last active admin.`);
  }
}
