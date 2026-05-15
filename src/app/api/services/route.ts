// GET  /api/services → Service[]
// POST /api/services → Service (admin role)
import { withAuth, ANY_AUTHED, ADMIN_ONLY } from "@/server/auth/with-auth";
import {
  listServices,
  createService,
  serviceCreateSchema,
} from "@/server/handlers/services";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => listServices()
);

export const POST = withAuth(
  {
    access: { auth: "session", roles: ADMIN_ONLY },
    body: serviceCreateSchema,
  },
  async ({ session, payload }) => createService(payload, session!.userId)
);
