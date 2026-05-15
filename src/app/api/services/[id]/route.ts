// GET    /api/services/:id  → Service | null
// PATCH  /api/services/:id  → Service | null  (admin)
// DELETE /api/services/:id  → { success: true } (admin + x-admin-pin)
import { z } from "zod";
import { withAuth, ANY_AUTHED, ADMIN_ONLY } from "@/server/auth/with-auth";
import {
  getService,
  updateService,
  deleteService,
  serviceUpdateSchema,
} from "@/server/handlers/services";

const idSchema = z.coerce.number().int().positive();

function parseId(params: Record<string, string>): number {
  const r = idSchema.safeParse(params.id);
  if (!r.success) throw new Error("Invalid id");
  return r.data;
}

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ params }) => getService(parseId(params))
);

export const PATCH = withAuth(
  {
    access: { auth: "session", roles: ADMIN_ONLY },
    body: serviceUpdateSchema,
  },
  async ({ params, session, payload }) =>
    updateService(parseId(params), payload, session!.userId)
);

export const DELETE = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY, requirePin: true } },
  async ({ params }) => deleteService(parseId(params))
);
