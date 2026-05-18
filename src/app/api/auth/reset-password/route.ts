// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/auth/with-auth";
import { resetPasswordByPin, resetPasswordByPinSchema } from "@/server/handlers/users";

export const POST = withAuth(
  { access: { auth: "public" }, body: resetPasswordByPinSchema },
  async ({ payload }) => {
    return resetPasswordByPin(payload);
  }
);
