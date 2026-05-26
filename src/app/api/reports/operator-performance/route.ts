import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { getOperatorPerformance, reportSummaryInputSchema } from "@/server/handlers/reports";
import { z } from "zod";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ req }) => {
    const url = new URL(req.url);
    const start = url.searchParams.get("start") || "";
    const end = url.searchParams.get("end") || "";

    const input = reportSummaryInputSchema.parse({ start, end });
    return getOperatorPerformance(input);
  }
);
