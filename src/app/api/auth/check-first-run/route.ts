// GET /api/auth/check-first-run → boolean
import { withAuth } from "@/server/auth/with-auth";
import { checkFirstRun } from "@/server/handlers/auth";

export const GET = withAuth({ access: { auth: "public" } }, async () => {
  return checkFirstRun();
});
