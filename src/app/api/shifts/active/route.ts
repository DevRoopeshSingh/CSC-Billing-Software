import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { getActiveShift } from "@/server/handlers/shifts";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => {
    const shift = await getActiveShift();
    if (!shift) return null;
    return shift;
  }
);
