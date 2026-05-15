// GET  /api/customers       → ListCustomersRow[]
// POST /api/customers       → Customer  (body = customerCreateSchema)
import { withAuth, ANY_AUTHED, STAFF_PLUS } from "@/server/auth/with-auth";
import {
  listCustomers,
  createCustomer,
  customerCreateSchema,
} from "@/server/handlers/customers";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => listCustomers()
);

export const POST = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: customerCreateSchema,
  },
  async ({ session, payload }) => createCustomer(payload, session!.userId)
);
