// src/app/api/reports/range/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { getInvoicesByRange, reportSummaryInputSchema } from "@/server/handlers/reports";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ req }) => {
    const url = new URL(req.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    
    const parsed = reportSummaryInputSchema.parse({ start, end });
    const data = await getInvoicesByRange(parsed);
    return data;
  }
);
