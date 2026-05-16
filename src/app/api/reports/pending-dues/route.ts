// GET /api/reports/pending-dues → PendingDues
import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { getPendingDues } from "@/server/handlers/reports";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => getPendingDues()
);
