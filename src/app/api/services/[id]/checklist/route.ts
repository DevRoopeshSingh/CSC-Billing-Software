// GET /api/services/:id/checklist → ServiceChecklistItem[]
// PUT /api/services/:id/checklist → ServiceChecklistItem[]  (replace-all upsert, staff+)
import { z } from "zod";
import { withAuth, ANY_AUTHED, STAFF_PLUS } from "@/server/auth/with-auth";
import {
  listChecklist,
  upsertChecklistBulk,
  checklistBodySchema,
} from "@/server/handlers/services";

const idSchema = z.coerce.number().int().positive();

function parseId(params: Record<string, string>): number {
  const r = idSchema.safeParse(params.id);
  if (!r.success) throw new Error("Invalid id");
  return r.data;
}

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ params }) => listChecklist(parseId(params))
);

export const PUT = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: checklistBodySchema,
  },
  async ({ params, payload }) =>
    upsertChecklistBulk({ serviceId: parseId(params), items: payload.items })
);
