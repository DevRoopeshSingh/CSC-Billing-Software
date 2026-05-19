// src/server/handlers/auth.ts
// Pure auth handlers — no Next, no IPC. Direct port of the safeHandle blocks
// for USERS_CHECK_FIRST_RUN, USERS_SETUP_ADMIN, USERS_LOGIN, USERS_LOGOUT,
// USERS_RESUME_SESSION in src/main/index.ts. Same trust model: the resume
// path re-reads role from the DB, so a forged cookie cannot grant a role.

import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { hashPin, verifyPin } from "@/lib/pin";
import { createSession, revokeSession, type Role } from "../auth/sessions";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginFailures,
} from "../auth/rate-limit";
import type {
  LoginRequest,
  SetupRequest,
} from "@/shared/types";

export interface SessionUser {
  id: number;
  username: string;
  role: Role;
}

export interface AuthSuccess {
  token: string;
  user: SessionUser;
}

export async function checkFirstRun(): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.users);
  return (row?.count ?? 0) === 0;
}

export async function setupAdmin(data: SetupRequest): Promise<AuthSuccess> {
  const db = getDb();
  const passwordHash = await hashPin(data.password);
  const pinHash = await hashPin(data.adminPin);

  const created = await db.transaction(async (tx) => {
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(schema.users);
    if (count > 0) throw new Error("Admin already setup");

    const [u] = await tx
      .insert(schema.users)
      .values({
        username: data.username,
        passwordHash,
        role: "admin",
        isActive: true,
      })
      .returning();

    // Ensure singleton center_profiles row exists, then write the PIN.
    const existing = await tx
      .select({ id: schema.centerProfiles.id })
      .from(schema.centerProfiles)
      .limit(1);
    if (existing.length === 0) {
      await tx.insert(schema.centerProfiles).values({ pinHash });
    } else {
      await tx
        .update(schema.centerProfiles)
        .set({ pinHash })
        .where(eq(schema.centerProfiles.id, existing[0].id));
    }
    return u;
  });

  const role = created.role as Role;
  const token = await createSession(created.id, role);
  return {
    token,
    user: { id: created.id, username: created.username, role },
  };
}

export async function login(data: LoginRequest): Promise<AuthSuccess> {
  checkLoginRateLimit(data.username);
  const db = getDb();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, data.username))
    .limit(1);

  if (!user || !user.isActive) {
    recordLoginFailure(data.username);
    throw new Error("Invalid username or password");
  }
  const ok = await verifyPin(data.password, user.passwordHash);
  if (!ok) {
    recordLoginFailure(data.username);
    throw new Error("Invalid username or password");
  }
  clearLoginFailures(data.username);
  const role = user.role as Role;
  const token = await createSession(user.id, role);
  return {
    token,
    user: { id: user.id, username: user.username, role },
  };
}

export function logout(sessionToken: string | null): { success: true } {
  if (sessionToken) revokeSession(sessionToken);
  return { success: true };
}

// Re-reads the user from the DB so a forged/tampered cookie cannot grant a
// role. Caller passes the (userId, role) the in-memory store believes; we
// confirm it against the canonical row. Returns null on mismatch — the route
// handler is responsible for revoking the session and clearing cookies.
export async function resumeSessionFromStore(
  userId: number,
  expectedRole: Role
): Promise<SessionUser | null> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user || !user.isActive) return null;
  if (user.role !== expectedRole) return null;
  return { id: user.id, username: user.username, role: user.role as Role };
}
