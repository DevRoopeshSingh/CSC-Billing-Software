// POST /api/auth/logout → { success: true } (both cookies cleared)
// Public on purpose: works even with an expired/missing session.
import { NextResponse, type NextRequest } from "next/server";
import { logout } from "@/server/handlers/auth";
import {
  SESSION_COOKIE,
  clearAuthCookies,
} from "@/server/auth/cookies";

export async function POST(req: NextRequest): Promise<Response> {
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? null;
  const data = logout(token);
  const res = NextResponse.json(data);
  clearAuthCookies(res);
  return res;
}
