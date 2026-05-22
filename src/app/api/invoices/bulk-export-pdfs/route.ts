import { z } from "zod";
import { NextResponse } from "next/server";
import { withAuth, STAFF_PLUS } from "@/server/auth/with-auth";
import { getInvoice } from "@/server/handlers/invoices";
import { getCenterProfile } from "@/server/handlers/center";
import { getBrandingAsset } from "@/server/handlers/branding";
import { generateInvoicePdfBytes } from "@/main/invoicePdf";
import AdmZip from "adm-zip";

const payloadSchema = z.object({
  invoiceIds: z.array(z.number().int().positive()).min(1).max(100, "Maximum of 100 invoices can be exported at once. Please select fewer invoices.")
});

export const POST = withAuth(
  { access: { auth: "session", roles: STAFF_PLUS }, body: payloadSchema },
  async ({ payload }) => {
    try {
      const { invoiceIds } = payload;
      
      const center = await getCenterProfile();
      const logoAsset = await getBrandingAsset("logo");
      const upiQrAsset = await getBrandingAsset("upiQr");

      const centerForPdf = center ? {
        ...center,
        logoFile: logoAsset ? { data: new Uint8Array(logoAsset.data), mimeType: logoAsset.mimeType } : null,
        upiQrFile: upiQrAsset ? { data: new Uint8Array(upiQrAsset.data), mimeType: upiQrAsset.mimeType } : null,
      } : null;

      const zip = new AdmZip();
      let addedCount = 0;

      for (const id of invoiceIds) {
        const invoice = await getInvoice(id);
        if (!invoice) continue;

        try {
          const bytes = await generateInvoicePdfBytes(invoice as any, centerForPdf);
          const safeName = invoice.invoiceNo.replace(/[^A-Za-z0-9_-]/g, "_") + ".pdf";
          zip.addFile(safeName, Buffer.from(bytes));
          addedCount++;
        } catch (err) {
          console.error(`Failed to generate PDF for invoice ${id}:`, err);
        }
      }

      if (addedCount === 0) {
        return NextResponse.json({ error: "Failed to generate any PDFs." }, { status: 500 });
      }

      const zipBuffer = zip.toBuffer();
      
      return new Response(zipBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Length": String(zipBuffer.byteLength),
          "Content-Disposition": `attachment; filename="invoices_export_${new Date().toISOString().split('T')[0]}.zip"`,
        },
      });
    } catch (err) {
      console.error("Bulk PDF export failed:", err);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }
);
