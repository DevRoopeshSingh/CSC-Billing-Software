import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, STAFF_PLUS, ANY_AUTHED } from "@/server/auth/with-auth";
import { deleteCustomerDocument, getCustomerDocuments } from "@/server/handlers/customer-documents";
import fs from "fs";
import path from "path";

const idSchema = z.coerce.number().int().positive();

function parseId(idRaw: string): number {
  const r = idSchema.safeParse(idRaw);
  if (!r.success) throw new Error("Invalid id");
  return r.data;
}

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ req, params }) => {
    const customerId = parseId(params.id);
    const docId = parseId(params.docId);
    
    const docs = await getCustomerDocuments(customerId);
    const doc = docs.find(d => d.id === docId);
    
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const uploadsDir = path.join(process.env.USER_DATA_PATH || process.cwd(), "uploads");
    const fullPath = path.join(uploadsDir, doc.filePath);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
    }

    const bytes = fs.readFileSync(fullPath);
    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `inline; filename="${doc.name}"`,
      },
    });
  }
);

export const DELETE = withAuth(
  { access: { auth: "session", roles: STAFF_PLUS } },
  async ({ params, session }) => {
    const docId = parseId(params.docId);
    return deleteCustomerDocument(docId, session!.userId);
  }
);
