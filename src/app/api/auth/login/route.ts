// POST /api/auth/login → { user } (session + csrf cookies set)
import { NextResponse } from "next/server";
import { loginRequestSchema } from "@/shared/types";
import { withAuth } from "@/server/auth/with-auth";
import { login } from "@/server/handlers/auth";
import { issueCsrfToken, setAuthCookies } from "@/server/auth/cookies";

export const POST = withAuth(
  { access: { auth: "public" }, body: loginRequestSchema },
  async ({ payload }) => {
    const { token, user } = await login(payload);
    const csrf = issueCsrfToken();
    const res = NextResponse.json({ user });
    setAuthCookies(res, token, csrf);
    return res;
  }
);
