// src/main/sessions.ts
// In-memory session store for the Electron main process.
// Sessions are intentionally process-scoped: they die with the app, so a stolen
// localStorage token is useless after a restart. No persistence by design.

import crypto from "crypto";

export type Role = "admin" | "staff" | "viewer";

export interface Session {
  userId: number;
  role: Role;
  expiresAt: number;
}

const TTL_MS = 12 * 60 * 60 * 1000;

const sessions = new Map<string, Session>();

export function createSession(userId: number, role: Role): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId, role, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function getSession(token: unknown): Session | null {
  if (typeof token !== "string" || token.length === 0) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  s.expiresAt = Date.now() + TTL_MS;
  return s;
}

export function revokeSession(token: unknown): void {
  if (typeof token !== "string") return;
  sessions.delete(token);
}

export function revokeUserSessions(userId: number): void {
  for (const [token, s] of sessions) {
    if (s.userId === userId) sessions.delete(token);
  }
}

export function updateUserRole(userId: number, role: Role): void {
  for (const s of sessions.values()) {
    if (s.userId === userId) s.role = role;
  }
}
