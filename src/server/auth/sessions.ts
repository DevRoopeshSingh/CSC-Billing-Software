// src/server/auth/sessions.ts
// In-memory session store. Process-scoped: sessions die with the server, so a
// stolen cookie is useless after a restart. Verbatim port of src/main/sessions.ts
// — only difference is `globalThis` survives Next.js hot reload in dev.

import crypto from "crypto";

export type Role = "admin" | "staff" | "viewer";

export interface Session {
  userId: number;
  role: Role;
  expiresAt: number;
}

const TTL_MS = 12 * 60 * 60 * 1000;

declare global {
  var __sessions: Map<string, Session> | undefined;
}

function store(): Map<string, Session> {
  if (!globalThis.__sessions) globalThis.__sessions = new Map();
  return globalThis.__sessions;
}

export function createSession(userId: number, role: Role): string {
  const token = crypto.randomBytes(32).toString("hex");
  store().set(token, { userId, role, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function getSession(token: unknown): Session | null {
  if (typeof token !== "string" || token.length === 0) return null;
  const s = store().get(token);
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    store().delete(token);
    return null;
  }
  s.expiresAt = Date.now() + TTL_MS;
  return s;
}

export function revokeSession(token: unknown): void {
  if (typeof token !== "string") return;
  store().delete(token);
}

export function revokeUserSessions(userId: number): void {
  for (const [token, s] of store()) {
    if (s.userId === userId) store().delete(token);
  }
}

export const SESSION_TTL_SECONDS = Math.floor(TTL_MS / 1000);
