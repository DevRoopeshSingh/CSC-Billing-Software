// src/server/handlers/users.ts
// Port of the USERS_* handlers from src/main/index.ts to run directly against
// Postgres via Drizzle, invoked by the Next.js App Router API routes.

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";
import { hashPin, verifyPin } from "@/lib/pin";
import { revokeUserSessions } from "../auth/sessions";
import { requireAdminPin } from "../auth/admin-pin";
import { checkLoginRateLimit, recordLoginFailure, clearLoginFailures } from "../auth/rate-limit";
import type { Role } from "../auth/sessions";

// Schema definitions ported from main/index.ts
export const createUserSchema = z.object({
  username: z.string().min(1, "Username is required").max(100),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "staff", "viewer"]),
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["admin", "staff", "viewer"]).optional(),
  isActive: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  userId: z.number().int().positive(),
  oldPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const resetPasswordByPinSchema = z.object({
  username: z.string().min(1),
  adminPin: z.string().min(4),
  newPassword: z.string().min(6),
});

type PendingChange = { kind: "demote" } | { kind: "disable" } | { kind: "delete" };

async function assertNotLastAdmin(targetUserId: number, change: PendingChange): Promise<void> {
  const db = getDb();
  const [target] = await db
    .select({ role: schema.users.role, isActive: schema.users.isActive })
    .from(schema.users)
    .where(eq(schema.users.id, targetUserId))
    .limit(1);
  
  if (!target) throw new Error("User not found");
  if (target.role !== "admin" || !target.isActive) return;

  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.users)
    .where(and(eq(schema.users.role, "admin"), eq(schema.users.isActive, true)));
  
  const activeAdmins = row?.count ?? 0;
  if (activeAdmins - 1 < 1) {
    const verb = change.kind === "delete" ? "delete" : change.kind === "disable" ? "disable" : "demote";
    throw new Error(`Cannot ${verb} the last active admin.`);
  }
}

export async function listUsers() {
  const db = getDb();
  return db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      email: schema.users.email,
      role: schema.users.role,
      isActive: schema.users.isActive,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users);
}

export async function createUser(data: z.infer<typeof createUserSchema>) {
  const db = getDb();
  const passwordHash = await hashPin(data.password);
  
  const [user] = await db
    .insert(schema.users)
    .values({
      username: data.username,
      email: data.email ?? null,
      passwordHash,
      role: data.role,
      isActive: data.isActive,
    })
    .returning();
    
  return { id: user.id, username: user.username, role: user.role as Role };
}

export async function updateUser(id: number, data: z.infer<typeof userUpdateSchema>, sessionUserId: number, sessionRole: Role) {
  if (id === sessionUserId) {
    if (data.role !== undefined && data.role !== sessionRole) {
      throw new Error("Cannot change your own role.");
    }
    if (data.isActive === false) {
      throw new Error("Cannot disable your own account.");
    }
  }

  const willDemote = data.role !== undefined && data.role !== "admin";
  const willDisable = data.isActive === false;

  const db = getDb();
  return db.transaction(async (tx) => {
    if (willDemote) await assertNotLastAdmin(id, { kind: "demote" });
    if (willDisable) await assertNotLastAdmin(id, { kind: "disable" });

    const [updated] = await tx
      .update(schema.users)
      .set({
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      })
      .where(eq(schema.users.id, id))
      .returning();

    if (willDisable) revokeUserSessions(id);
    // Note: updateUserRole(id, role) is not available in the stateless HTTP model.
    // By revoking sessions on disable, the next request will fail. For demotion,
    // the resumeSessionFromStore helper checks the DB so tampered cookies fail.

    return updated;
  });
}

export async function changePassword(data: z.infer<typeof changePasswordSchema>, sessionUserId: number, sessionRole: Role) {
  const isSelf = data.userId === sessionUserId;
  if (!isSelf && sessionRole !== "admin") {
    throw new Error("Forbidden");
  }

  const db = getDb();
  if (isSelf) {
    if (!data.oldPassword) throw new Error("Current password required.");
    const [me] = await db.select().from(schema.users).where(eq(schema.users.id, sessionUserId)).limit(1);
    if (!me) throw new Error("User not found");
    const ok = await verifyPin(data.oldPassword, me.passwordHash);
    if (!ok) throw new Error("Current password is incorrect.");
  }

  const passwordHash = await hashPin(data.newPassword);
  await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, data.userId));
  if (!isSelf) revokeUserSessions(data.userId);
  return { success: true };
}

export async function resetPasswordByPin(data: z.infer<typeof resetPasswordByPinSchema>) {
  checkLoginRateLimit(data.username);
  
  const db = getDb();
  const [profile] = await db
    .select({ pinHash: schema.centerProfiles.pinHash })
    .from(schema.centerProfiles)
    .where(eq(schema.centerProfiles.id, 1))
    .limit(1);
    
  if (!profile?.pinHash) {
    recordLoginFailure(data.username);
    throw new Error("Admin PIN not configured. Reset unavailable.");
  }
  
  const pinOk = await verifyPin(data.adminPin, profile.pinHash);
  if (!pinOk) {
    recordLoginFailure(data.username);
    throw new Error("Incorrect admin PIN.");
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, data.username))
    .limit(1);
    
  if (!user || !user.isActive) {
    recordLoginFailure(data.username);
    throw new Error("No active user with that username.");
  }

  const passwordHash = await hashPin(data.newPassword);
  await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, user.id));
  
  revokeUserSessions(user.id);
  clearLoginFailures(data.username);
  
  return { success: true };
}
