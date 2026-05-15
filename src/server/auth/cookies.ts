// src/server/auth/cookies.ts
// Cookie wiring for session + CSRF. Two cookies:
//
//   csc_session  HttpOnly, Secure (prod), SameSite=Lax — the opaque session
//                token. JS in the browser cannot read it; XSS cannot steal it.
//   csc_csrf     Not HttpOnly, SameSite=Lax — random token mirrored into the
//                x-csrf-token header on mutations (double-submit pattern).
//
// On login/setup we issue both. On logout we clear both. On session resume
// we re-issue csrf if the cookie is missing (e.g. user cleared cookies).

import crypto from "crypto";
import type { NextResponse } from "next/server";
import { SESSION_TTL_SECONDS } from "./sessions";

export const SESSION_COOKIE = "csc_session";
export const CSRF_COOKIE = "csc_csrf";
export const CSRF_HEADER = "x-csrf-token";

const isProd = process.env.NODE_ENV === "production";

interface CookieOpts {
  httpOnly?: boolean;
  maxAge?: number;
}

function baseCookie(name: string, value: string, opts: CookieOpts) {
  return {
    name,
    value,
    httpOnly: opts.httpOnly ?? false,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: opts.maxAge ?? SESSION_TTL_SECONDS,
  };
}

export function issueCsrfToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function setAuthCookies(
  res: NextResponse,
  sessionToken: string,
  csrfToken: string
): void {
  res.cookies.set(baseCookie(SESSION_COOKIE, sessionToken, { httpOnly: true }));
  res.cookies.set(baseCookie(CSRF_COOKIE, csrfToken, { httpOnly: false }));
}

export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set({ ...baseCookie(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0 }) });
  res.cookies.set({ ...baseCookie(CSRF_COOKIE, "", { httpOnly: false, maxAge: 0 }) });
}

// Constant-time compare to prevent timing leaks on the CSRF token.
export function csrfMatches(headerToken: string | null, cookieToken: string | null): boolean {
  if (!headerToken || !cookieToken) return false;
  if (headerToken.length !== cookieToken.length) return false;
  const a = Buffer.from(headerToken);
  const b = Buffer.from(cookieToken);
  return crypto.timingSafeEqual(a, b);
}
