import { withAuth, ADMIN_ONLY } from "@/server/auth/with-auth";
import { listAuditLogs } from "@/server/handlers/audit";

export const GET = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY } },
  async (ctx) => {
    const { searchParams } = new URL(ctx.req.url);
    const action = searchParams.get("action") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const userId = searchParams.get("userId") ? parseInt(searchParams.get("userId")!) : undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 200;

    return await listAuditLogs({ action, entityType, userId, startDate, endDate, limit });
  }
);
