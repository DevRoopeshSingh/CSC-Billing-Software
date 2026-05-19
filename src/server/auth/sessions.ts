// src/server/auth/sessions.ts
// Stateless JWT session store. Safe for serverless environments (Vercel).
// Eliminates the ephemeral in-memory Map that caused 401s across lambdas.

import { SignJWT, jwtVerify } from "jose";

export type Role = "admin" | "staff" | "viewer";

export interface Session {
  userId: number;
  role: Role;
  expiresAt: number;
}

const TTL_MS = 12 * 60 * 60 * 1000;
export const SESSION_TTL_SECONDS = Math.floor(TTL_MS / 1000);

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is missing in production.");
    }
    return new TextEncoder().encode("dev-fallback-secret-do-not-use-in-prod");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: number, role: Role): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(SESSION_TTL_SECONDS + "s")
    .sign(getSecret());
}

export async function getSession(token: unknown): Promise<Session | null> {
  if (typeof token !== "string" || token.length === 0) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as number,
      role: payload.role as Role,
      expiresAt: (payload.exp as number) * 1000,
    };
  } catch {
    return null;
  }
}

export function revokeSession(token: unknown): void {
  // Stateless JWTs cannot be revoked individually without a DB blocklist.
  // Revocation is handled gracefully by clearing the client-side cookie.
  // For security, the `/api/auth/session` resume endpoint still validates
  // the user's DB state (isActive/role) and will forcefully clear invalid cookies.
}

export function revokeUserSessions(userId: number): void {
  // Stateless JWTs rely on the DB. If an admin disables a user, the next
  // time they hit a DB-validated path, they will be logged out.
}
