// GET   /api/center → CenterProfileShape | null   (any authed)
// PATCH /api/center → CenterProfileShape | null   (admin role; body locked
//                     to the columns the settings form can edit — printer
//                     fields, pinHash, invoiceNumber, logoKey/upiQrKey,
//                     and lastBackupDate are rejected by the strict schema)
import { withAuth, ANY_AUTHED, ADMIN_ONLY } from "@/server/auth/with-auth";
import {
  getCenterProfile,
  updateCenterProfile,
  centerUpdateInputSchema,
} from "@/server/handlers/center";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async () => getCenterProfile()
);

export const PATCH = withAuth(
  {
    access: { auth: "session", roles: ADMIN_ONLY },
    body: centerUpdateInputSchema,
  },
  async ({ payload }) => updateCenterProfile(payload)
);
