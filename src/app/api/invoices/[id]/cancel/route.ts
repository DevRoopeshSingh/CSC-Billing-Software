// POST /api/invoices/:id/cancel → InvoiceShape | null  (admin + x-admin-pin)
// Cancellation removes the invoice from revenue aggregation, so it is an
// admin-only, PIN-gated action.
import { z } from "zod";
import { withAuth, ADMIN_ONLY } from "@/server/auth/with-auth";
import { cancelInvoice } from "@/server/handlers/invoices";

const idSchema = z.coerce.number().int().positive();

function parseId(params: Record<string, string>): number {
  const r = idSchema.safeParse(params.id);
  if (!r.success) throw new Error("Invalid id");
  return r.data;
}

export const POST = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY, requirePin: true } },
  async ({ params, session }) => cancelInvoice(parseId(params), session!.userId)
);
