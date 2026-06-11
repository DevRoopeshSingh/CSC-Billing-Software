import { withAuth, ANY_AUTHED, STAFF_PLUS } from "@/server/auth/with-auth";
import {
  listShifts,
  startShift,
  shiftStartSchema,
} from "@/server/handlers/shifts";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => listShifts()
);

export const POST = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: shiftStartSchema,
  },
  async ({ session, payload }) => startShift(payload, session!.userId)
);
