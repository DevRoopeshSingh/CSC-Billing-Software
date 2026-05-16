// POST /api/services/bulk-delete → BulkDeleteServicesResult  (admin + x-admin-pin)
// In-use guard: services referenced by invoice_items are returned in
// skippedInUse and not deleted. See src/server/handlers/services.ts.
import { withAuth, ADMIN_ONLY } from "@/server/auth/with-auth";
import {
  bulkDeleteServices,
  bulkDeleteInputSchema,
} from "@/server/handlers/services";

export const POST = withAuth(
  {
    access: { auth: "session", roles: ADMIN_ONLY, requirePin: true },
    body: bulkDeleteInputSchema,
  },
  async ({ payload }) => bulkDeleteServices(payload)
);
