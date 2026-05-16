// POST /api/center/branding → UploadBrandingResult   (admin + x-admin-pin)
// Multipart-only. The form must include:
//   - kind:  "logo" | "upiQr"   (text field)
//   - file:  <binary>           (File field)
// No JSON body schema is registered, so `withAuth` skips JSON parsing and the
// handler reads `req.formData()` directly. MIME and size are validated inside
// the branding handler against the shared constants in src/shared/types.ts.
import { NextResponse } from "next/server";
import { withAuth, ADMIN_ONLY } from "@/server/auth/with-auth";
import { uploadBrandingAsset } from "@/server/handlers/branding";

export const POST = withAuth(
  { access: { auth: "session", roles: ADMIN_ONLY, requirePin: true } },
  async ({ req }) => {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Expected multipart/form-data", code: "BAD_FORM" },
        { status: 400 }
      );
    }
    const kind = form.get("kind");
    const file = form.get("file");
    if (typeof kind !== "string") {
      return NextResponse.json(
        { error: "Missing 'kind' field", code: "BAD_INPUT" },
        { status: 400 }
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'file' field", code: "BAD_INPUT" },
        { status: 400 }
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    return NextResponse.json(
      await uploadBrandingAsset({
        kind,
        mimeType: file.type,
        data: bytes,
      })
    );
  }
);
