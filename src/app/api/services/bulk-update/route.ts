// POST /api/services/bulk-update → { updated: number }  (admin)
import { withAuth, ADMIN_ONLY } from "@/server/auth/with-auth";
import {
  bulkUpdateServices,
  bulkUpdateInputSchema,
} from "@/server/handlers/services";

export const POST = withAuth(
  {
    access: { auth: "session", roles: ADMIN_ONLY },
    body: bulkUpdateInputSchema,
  },
  async ({ payload }) => bulkUpdateServices(payload)
);
