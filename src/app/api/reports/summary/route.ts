// GET /api/reports/summary?start=YYYY-MM-DD&end=YYYY-MM-DD → ReportSummary
import { NextRequest } from "next/server";
import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import {
  getReportSummary,
  reportSummaryInputSchema,
} from "@/server/handlers/reports";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ req }: { req: NextRequest }) => {
    const start = req.nextUrl.searchParams.get("start");
    const end = req.nextUrl.searchParams.get("end");
    const input = reportSummaryInputSchema.parse({ start, end });
    return getReportSummary(input);
  }
);
