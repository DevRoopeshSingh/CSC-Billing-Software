// POST /api/invoices/bulk-mark-paid → BulkMarkPaidResult
// Single UPDATE … WHERE id IN (…) AND status='PENDING' — PAID/CANCELLED rows
// are silently skipped, matching the IPC version's behavior.
import { withAuth, STAFF_PLUS } from "@/server/auth/with-auth";
import {
  bulkMarkPaid,
  bulkMarkPaidInputSchema,
} from "@/server/handlers/invoices";

export const POST = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: bulkMarkPaidInputSchema,
  },
  async ({ session, payload }) => bulkMarkPaid(payload, session!.userId)
);
