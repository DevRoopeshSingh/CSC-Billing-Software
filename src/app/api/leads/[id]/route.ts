import { z } from "zod";
import { withAuth, ANY_AUTHED, STAFF_PLUS, ADMIN_ONLY } from "@/server/auth/with-auth";
import { updateLead, deleteLead, leadUpdateSchema } from "@/server/handlers/leads";

const idSchema = z.coerce.number().int().positive();

function parseId(params: Record<string, string>): number {
  const r = idSchema.safeParse(params.id);
  if (!r.success) throw new Error("Invalid id");
  return r.data;
}

export const PATCH = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: leadUpdateSchema,
  },
  async ({ params, session, payload }) => updateLead(parseId(params), payload, session!.userId)
);

export const DELETE = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY, requirePin: true } },
  async ({ params }) => deleteLead(parseId(params))
);
