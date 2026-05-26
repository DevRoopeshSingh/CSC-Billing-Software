import { withAuth, ANY_AUTHED, STAFF_PLUS } from "@/server/auth/with-auth";
import { listFaqs, createFaq, faqCreateSchema } from "@/server/handlers/faq";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => listFaqs()
);

export const POST = withAuth(
  {
    access: { auth: "session", roles: STAFF_PLUS },
    body: faqCreateSchema,
  },
  async ({ session, payload }) => createFaq(payload, session!.userId)
);
