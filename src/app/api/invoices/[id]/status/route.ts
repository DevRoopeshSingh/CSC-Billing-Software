// POST /api/invoices/:id/status → InvoiceShape | null
// body: { status: "PAID" | "PENDING" } — CANCELLED is rejected here; it has
// its own admin+PIN-gated /cancel route.
import { z } from "zod";
import { withAuth, STAFF_PLUS } from "@/server/auth/with-auth";
import {
  setInvoiceStatus,
  setStatusInputSchema,
} from "@/server/handlers/invoices";

const idSchema = z.coerce.number().int().positive();

function parseId(params: Record<string, string>): number {
  const r = idSchema.safeParse(params.id);
  if (!r.success) throw new Error("Invalid id");
  return r.data;
}

export const POST = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: setStatusInputSchema,
  },
  async ({ params, session, payload }) =>
    setInvoiceStatus(parseId(params), payload, session!.userId)
);
