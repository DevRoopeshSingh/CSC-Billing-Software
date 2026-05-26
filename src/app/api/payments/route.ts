import { withAuth, STAFF_PLUS } from "@/server/auth/with-auth";
import { paymentSchema } from "@/shared/types";
import { createPayment } from "@/server/handlers/payments";

export const POST = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: paymentSchema.omit({ id: true, createdBy: true }),
  },
  async ({ session, payload }) => createPayment(payload, session!.userId)
);
