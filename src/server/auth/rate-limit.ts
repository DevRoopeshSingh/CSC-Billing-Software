// src/server/auth/rate-limit.ts
// Login-attempt throttle. Ported from src/main/auth-guards.ts. Per-username,
// in-memory. Behind a load balancer with multiple workers this becomes a
// per-pod limit — fine for Phase 1, replace with Redis/Upstash when scaling.

const FAILURES_BEFORE_LOCK = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

interface FailureRecord {
  count: number;
  lockedUntil: number;
}

declare global {
  var __loginFailures: Map<string, FailureRecord> | undefined;
}

function store(): Map<string, FailureRecord> {
  if (!globalThis.__loginFailures) globalThis.__loginFailures = new Map();
  return globalThis.__loginFailures;
}

export function checkLoginRateLimit(username: string): void {
  const rec = store().get(username);
  if (!rec) return;
  if (rec.lockedUntil > Date.now()) {
    const secs = Math.ceil((rec.lockedUntil - Date.now()) / 1000);
    throw new Error(
      `Too many failed attempts. Try again in ${secs} second${secs === 1 ? "" : "s"}.`
    );
  }
}

export function recordLoginFailure(username: string): void {
  const rec = store().get(username) ?? { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= FAILURES_BEFORE_LOCK) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
    rec.count = 0;
  }
  store().set(username, rec);
}

export function clearLoginFailures(username: string): void {
  store().delete(username);
}
