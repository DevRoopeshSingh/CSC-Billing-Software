// GET /api/auth/session → { user } | { user: null }
// Resume endpoint. Re-reads the canonical role from the DB; if the cookie
// session disagrees with the DB (disabled / role changed), wipes both cookies.
import { NextResponse, type NextRequest } from "next/server";
import { getSession, revokeSession } from "@/server/auth/sessions";
import {
  SESSION_COOKIE,
  CSRF_COOKIE,
  clearAuthCookies,
  issueCsrfToken,
  setAuthCookies,
} from "@/server/auth/cookies";
import { resumeSessionFromStore } from "@/server/handlers/auth";

export async function GET(req: NextRequest): Promise<Response> {
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? null;
  const s = getSession(token);
  if (!token || !s) {
    const res = NextResponse.json({ user: null });
    if (token) clearAuthCookies(res);
    return res;
  }

  const user = await resumeSessionFromStore(s.userId, s.role);
  if (!user) {
    revokeSession(token);
    const res = NextResponse.json({ user: null });
    clearAuthCookies(res);
    return res;
  }

  const res = NextResponse.json({ user });
  // Refresh CSRF cookie if the client lost it.
  const hasCsrf = req.cookies.get(CSRF_COOKIE)?.value;
  if (!hasCsrf) {
    setAuthCookies(res, token, issueCsrfToken());
  }
  return res;
}
