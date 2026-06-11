import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { getExpectedShiftMath } from "@/server/handlers/shifts";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ params }) => {
    const id = Number(params?.id);
    if (isNaN(id)) throw new Error("Invalid shift ID");
    return getExpectedShiftMath(id);
  }
);
