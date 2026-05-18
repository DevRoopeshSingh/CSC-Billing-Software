// src/app/api/users/[id]/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { changePassword, changePasswordSchema } from "@/server/handlers/users";

export const POST = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ req, params, session }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw new Error("Invalid user ID");
    
    const raw = await req.json();
    const parsed = changePasswordSchema.parse({ ...raw, userId: id });
    
    const data = await changePassword(parsed, session!.userId, session!.role);
    return data;
  }
);
