// GET /api/reports/udhar
import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { getUdharInvoices } from "@/server/handlers/invoices";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => {
    return getUdharInvoices();
  }
);
