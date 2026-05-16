// GET  /api/invoices → InvoiceDetailShape[]
// POST /api/invoices → { id, invoiceNo }  (body = createInvoiceInputSchema)
import { withAuth, ANY_AUTHED, STAFF_PLUS } from "@/server/auth/with-auth";
import {
  listInvoices,
  createInvoice,
  createInvoiceInputSchema,
} from "@/server/handlers/invoices";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => listInvoices()
);

export const POST = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: createInvoiceInputSchema,
  },
  async ({ session, payload }) => createInvoice(payload, session!.userId)
);
