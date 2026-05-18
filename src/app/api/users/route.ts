// src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth, ADMIN_ONLY } from "@/server/auth/with-auth";
import { listUsers, createUser, createUserSchema } from "@/server/handlers/users";

export const GET = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY } },
  async () => {
    const data = await listUsers();
    return data;
  }
);

export const POST = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY }, body: createUserSchema },
  async ({ payload }) => {
    const data = await createUser(payload);
    return data;
  }
);
