import { withAuth, STAFF_PLUS } from "@/server/auth/with-auth";
import { closeShift, shiftCloseSchema } from "@/server/handlers/shifts";

export const POST = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: shiftCloseSchema,
  },
  async ({ session, payload, params }) => {
    const id = Number(params?.id);
    if (isNaN(id)) throw new Error("Invalid shift ID");
    return closeShift(id, payload, session!.userId);
  }
);
