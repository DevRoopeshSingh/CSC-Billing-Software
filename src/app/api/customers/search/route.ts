// GET /api/customers/search?q=foo → ListCustomersRow[]
import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { searchCustomers, listCustomers } from "@/server/handlers/customers";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ req }) => {
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    return q ? searchCustomers(q) : listCustomers();
  }
);
