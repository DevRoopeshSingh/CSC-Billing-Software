// POST /api/services/:id/bookmark → Service (toggles is_bookmarked atomically)
import { z } from "zod";
import { withAuth, STAFF_PLUS } from "@/server/auth/with-auth";
import { toggleBookmark } from "@/server/handlers/services";

const idSchema = z.coerce.number().int().positive();

export const POST = withAuth(
  { access: { auth: "session", roles: STAFF_PLUS } },
  async ({ params }) => {
    const r = idSchema.safeParse(params.id);
    if (!r.success) throw new Error("Invalid id");
    return toggleBookmark(r.data);
  }
);
