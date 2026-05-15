// POST /api/auth/setup → { user } (session + csrf cookies set)
// Public endpoint; bootstraps the first admin and a center_profiles row.
import { NextResponse } from "next/server";
import { setupRequestSchema } from "@/shared/types";
import { withAuth } from "@/server/auth/with-auth";
import { setupAdmin } from "@/server/handlers/auth";
import { issueCsrfToken, setAuthCookies } from "@/server/auth/cookies";

export const POST = withAuth(
  { access: { auth: "public" }, body: setupRequestSchema },
  async ({ payload }) => {
    const { token, user } = await setupAdmin(payload);
    const csrf = issueCsrfToken();
    const res = NextResponse.json({ user });
    setAuthCookies(res, token, csrf);
    return res;
  }
);
