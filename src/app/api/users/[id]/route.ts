// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth, ADMIN_ONLY } from "@/server/auth/with-auth";
import { updateUser, userUpdateSchema } from "@/server/handlers/users";

export const PATCH = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY }, body: userUpdateSchema },
  async ({ params, payload, session }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw new Error("Invalid user ID");
    
    const data = await updateUser(id, payload, session!.userId, session!.role);
    return data;
  }
);
