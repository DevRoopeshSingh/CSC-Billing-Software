// GET    /api/center/branding/:kind → raw image bytes (any authed)
//   - Returns the stored bytes with the stored Content-Type.
//   - `Cache-Control: private, max-age=60` so repeated <img> renders within
//     the same minute don't hit Postgres. Short window means a re-upload
//     becomes visible quickly.
// DELETE /api/center/branding/:kind → { success: true } (admin + x-admin-pin)
import { NextResponse } from "next/server";
import { withAuth, ANY_AUTHED, ADMIN_ONLY } from "@/server/auth/with-auth";
import {
  getBrandingAsset,
  deleteBrandingAsset,
} from "@/server/handlers/branding";

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ params }) => {
    const asset = await getBrandingAsset(params.kind);
    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    // Copy out of Node's pooled Buffer into a fresh ArrayBuffer. Avoids
    // the BodyInit "Uint8Array<ArrayBufferLike>" mismatch and detaches
    // the response payload from Node's buffer pool lifetime.
    const body = new ArrayBuffer(asset.data.byteLength);
    new Uint8Array(body).set(asset.data);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(asset.data.byteLength),
        "Cache-Control": "private, max-age=60",
        "Last-Modified": asset.updatedAt.toUTCString(),
      },
    });
  }
);

// DELETE intentionally does not require a PIN: removing branding only blanks
// the logo/QR until the next upload (which IS PIN-gated), so the user-facing
// reversibility is high. Keeping it admin-role-only matches how the IPC
// version behaved.
export const DELETE = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY } },
  async ({ params }) => deleteBrandingAsset(params.kind)
);
