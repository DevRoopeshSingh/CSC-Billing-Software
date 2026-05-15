// POST /api/services/bulk-delete → BulkDeleteServicesResult  (admin + x-admin-pin)
// Phase 2 limitation: skippedInUse is always [] until invoice_items lands in
// Postgres (see comment in src/server/handlers/services.ts:bulkDeleteServices).
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
