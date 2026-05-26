import { withAuth, ANY_AUTHED, STAFF_PLUS } from "@/server/auth/with-auth";
import { listLeads, createLead, leadCreateSchema } from "@/server/handlers/leads";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => listLeads()
);

export const POST = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: leadCreateSchema,
  },
  async ({ session, payload }) => createLead(payload, session!.userId)
);
