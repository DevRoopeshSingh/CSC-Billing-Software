import { z } from "zod";
import { NextResponse } from "next/server";
import { withAuth, ANY_AUTHED } from "@/server/auth/with-auth";
import { getInvoice } from "@/server/handlers/invoices";
import { getCenterProfile } from "@/server/handlers/center";
import { getBrandingAsset } from "@/server/handlers/branding";
import { generateInvoicePdfBytes } from "@/main/invoicePdf";

const idSchema = z.coerce.number().int().positive();

function parseId(params: Record<string, string>): number {
  const r = idSchema.safeParse(params.id);
  if (!r.success) throw new Error("Invalid id");
  return r.data;
}

export const GET = withAuth(
  { access: { auth: "session", roles: ANY_AUTHED } },
  async ({ params, req }) => {
    try {
      const id = parseId(params);
      const invoice = await getInvoice(id);
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      const center = await getCenterProfile();
      const logoAsset = await getBrandingAsset("logo");
      const upiQrAsset = await getBrandingAsset("upiQr");

      const centerForPdf = center ? {
        ...center,
        logoFile: logoAsset ? { data: new Uint8Array(logoAsset.data), mimeType: logoAsset.mimeType } : null,
        upiQrFile: upiQrAsset ? { data: new Uint8Array(upiQrAsset.data), mimeType: upiQrAsset.mimeType } : null,
      } : null;

      const bytes = await generateInvoicePdfBytes(invoice as any, centerForPdf);

      const url = new URL(req.url);
      const isDownload = url.searchParams.get("download") === "1";
      
      const safeName = invoice.invoiceNo.replace(/[^A-Za-z0-9_-]/g, "_");
      const disposition = isDownload ? `attachment; filename="${safeName}.pdf"` : "inline";

      // Return raw bytes with proper headers
      const body = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(body).set(bytes);
      
      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": String(bytes.byteLength),
          "Content-Disposition": disposition,
        },
      });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
  }
);
