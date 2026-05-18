// src/app/api/reports/top-services/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { getTopServices, topNSchema } from "@/server/handlers/reports";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ req }) => {
    const url = new URL(req.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    const limitParam = url.searchParams.get("limit");
    
    const parsed = topNSchema.parse({
      start,
      end,
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
    });
    
    const data = await getTopServices(parsed);
    return data;
  }
);
