// GET /api/services/bookmarked → Service[]  (active + bookmarked only)
import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { getBookmarkedServices } from "@/server/handlers/services";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => getBookmarkedServices()
);
