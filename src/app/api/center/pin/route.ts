// POST /api/center/pin → { success: true }   (admin role)
// Body: { newPin: string; currentPin?: string }
//   - First-time set (pinHash is NULL): currentPin optional, accepted.
//   - Change (pinHash exists): currentPin required and must verify; the
//     handler throws otherwise and `withAuth` returns 400 with the message.
import { withAuth, ADMIN_ONLY } from "@/server/auth/with-auth";
import { setCenterPin, setPinInputSchema } from "@/server/handlers/center";

export const POST = withAuth(
  {
    access: { auth: "session", roles: ADMIN_ONLY },
    body: setPinInputSchema,
  },
  async ({ payload }) => setCenterPin(payload)
);
