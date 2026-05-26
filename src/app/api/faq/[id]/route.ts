import { z } from "zod";
import { withAuth, ANY_AUTHED, STAFF_PLUS, ADMIN_ONLY } from "@/server/auth/with-auth";
import { updateFaq, deleteFaq, faqUpdateSchema } from "@/server/handlers/faq";

const idSchema = z.coerce.number().int().positive();

function parseId(params: Record<string, string>): number {
  const r = idSchema.safeParse(params.id);
  if (!r.success) throw new Error("Invalid id");
  return r.data;
}

export const PATCH = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: faqUpdateSchema,
  },
  async ({ params, session, payload }) => updateFaq(parseId(params), payload, session!.userId)
);

export const DELETE = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY, requirePin: true } },
  async ({ params }) => deleteFaq(parseId(params))
);
