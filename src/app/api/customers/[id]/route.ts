// GET    /api/customers/:id  → Customer | null
// PATCH  /api/customers/:id  → Customer | null   (body = customerUpdateSchema)
// DELETE /api/customers/:id  → { success: true } (admin role + x-admin-pin header)
import { z } from "zod";
import { withAuth, ANY_AUTHED, STAFF_PLUS, ADMIN_ONLY } from "@/server/auth/with-auth";
import {
  getCustomer,
  updateCustomer,
  deleteCustomer,
  customerUpdateSchema,
} from "@/server/handlers/customers";

const idSchema = z.coerce.number().int().positive();

function parseId(params: Record<string, string>): number {
  const r = idSchema.safeParse(params.id);
  if (!r.success) throw new Error("Invalid id");
  return r.data;
}

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ params }) => getCustomer(parseId(params))
);

export const PATCH = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: customerUpdateSchema,
  },
  async ({ params, session, payload }) =>
    updateCustomer(parseId(params), payload, session!.userId)
);

export const DELETE = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY, requirePin: true } },
  async ({ params }) => deleteCustomer(parseId(params))
);
