import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, STAFF_PLUS, ANY_AUTHED } from "@/server/auth/with-auth";
import { getCustomerDocuments, uploadCustomerDocument } from "@/server/handlers/customer-documents";

const idSchema = z.coerce.number().int().positive();

function parseId(params: Record<string, string>): number {
  const r = idSchema.safeParse(params.id);
  if (!r.success) throw new Error("Invalid id");
  return r.data;
}

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ params }) => {
    const customerId = parseId(params);
    return getCustomerDocuments(customerId);
  }
);

export const POST = withAuth(
  { access: { auth: "session", roles: STAFF_PLUS } },
  async ({ req, params, session }) => {
    const customerId = parseId(params);
    const formData = await req.formData();
    
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;

    if (!file || !name) {
      return NextResponse.json({ error: "File and name are required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const doc = await uploadCustomerDocument({
      customerId,
      name,
      mimeType: file.type,
      data: buffer,
      userId: session!.userId,
    });

    return NextResponse.json(doc);
  }
);
