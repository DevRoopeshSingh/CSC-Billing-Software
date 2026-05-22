import { withAuth, ADMIN_ONLY } from "@/server/auth/with-auth";
import { listAuditLogs } from "@/server/handlers/audit";

export const GET = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY } },
  async () => {
    return await listAuditLogs(100);
  }
);
