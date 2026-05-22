import { withAuth, ANY_AUTHED, STAFF_PLUS } from "@/server/auth/with-auth";
import {
  listShifts,
  createShift,
  shiftCreateSchema,
} from "@/server/handlers/shifts";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => listShifts()
);

export const POST = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: shiftCreateSchema,
  },
  async ({ session, payload }) => createShift(payload, session!.userId)
);
