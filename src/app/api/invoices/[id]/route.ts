// GET    /api/invoices/:id  → InvoiceDetailShape | null
// PATCH  /api/invoices/:id  → { id, invoiceNo }     (staff+, PENDING-only)
// DELETE /api/invoices/:id  → { success: true }     (admin + x-admin-pin)
import { z } from "zod";
import {
  withAuth,
  ANY_AUTHED,
  STAFF_PLUS,
  ADMIN_ONLY,
} from "@/server/auth/with-auth";
import {
  getInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceInputSchema,
} from "@/server/handlers/invoices";

const idSchema = z.coerce.number().int().positive();

function parseId(params: Record<string, string>): number {
  const r = idSchema.safeParse(params.id);
  if (!r.success) throw new Error("Invalid id");
  return r.data;
}

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ params }) => getInvoice(parseId(params))
);

export const PATCH = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: updateInvoiceInputSchema,
  },
  async ({ params, session, payload }) =>
    updateInvoice(parseId(params), payload, session!.userId)
);

export const DELETE = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY, requirePin: true } },
  async ({ params }) => deleteInvoice(parseId(params))
);
