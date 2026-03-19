import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const p = await params;
    const invoiceId = parseInt(p.id);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: {
          include: { service: true }
        }
      }
    });

    const center = await prisma.centerProfile.findUnique({ where: { id: 1 } });

    if (!invoice || !center) {
      return new NextResponse("Invoice or Center Profile not found", { status: 404 });
    }

    // Initialize document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
    const { width, height } = page.getSize();
    
    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let cursorY = height - 50;
    
    // Header
    page.drawText(center.centerName || "CSC Center", {
      x: 50, y: cursorY, size: 24, font: fontBold, color: rgb(0.1, 0.3, 0.8)
    });
    
    cursorY -= 25;
    page.drawText(`Address: ${center.address || 'N/A'}`, { x: 50, y: cursorY, size: 10, font: fontRegular });
    cursorY -= 15;
    page.drawText(`Mobile: ${center.mobile || 'N/A'} | Email: ${center.email || 'N/A'}`, { x: 50, y: cursorY, size: 10, font: fontRegular });
    
    // Invoice Meta
    cursorY -= 40;
    page.drawText("TAX INVOICE", { x: width - 200, y: height - 50, size: 20, font: fontBold });
    page.drawText(`Invoice No: ${invoice.invoiceNo}`, { x: width - 200, y: height - 75, size: 12, font: fontBold });
    page.drawText(`Date: ${invoice.createdAt.toLocaleDateString("en-IN")}`, { x: width - 200, y: height - 90, size: 10, font: fontRegular });
    page.drawText(`Status: ${invoice.status}`, { x: width - 200, y: height - 105, size: 10, font: fontBold, color: invoice.status === 'PAID' ? rgb(0.1, 0.7, 0.3) : rgb(0.9, 0.1, 0.1) });

    // Customer
    page.drawText("Billed To:", { x: 50, y: cursorY, size: 12, font: fontBold });
    cursorY -= 15;
    page.drawText(invoice.customer.name, { x: 50, y: cursorY, size: 12, font: fontRegular });
    cursorY -= 15;
    page.drawText(`Mobile: ${invoice.customer.mobile}`, { x: 50, y: cursorY, size: 10, font: fontRegular });

    // Table Header
    cursorY -= 40;
    page.drawRectangle({ x: 50, y: cursorY - 10, width: width - 100, height: 25, color: rgb(0.95, 0.95, 0.95) });
    page.drawText("Description", { x: 60, y: cursorY, size: 10, font: fontBold });
    page.drawText("Qty", { x: 300, y: cursorY, size: 10, font: fontBold });
    page.drawText("Rate", { x: 350, y: cursorY, size: 10, font: fontBold });
    page.drawText("Tax", { x: 420, y: cursorY, size: 10, font: fontBold });
    page.drawText("Total", { x: 490, y: cursorY, size: 10, font: fontBold });
    
    cursorY -= 25;
    
    // Table Rows
    for (const item of invoice.items) {
      page.drawText(item.description || item.service.name, { x: 60, y: cursorY, size: 10, font: fontRegular });
      page.drawText(item.qty.toString(), { x: 300, y: cursorY, size: 10, font: fontRegular });
      page.drawText(`Rs ${item.rate.toFixed(2)}`, { x: 350, y: cursorY, size: 10, font: fontRegular });
      page.drawText(`${item.taxRate}%`, { x: 420, y: cursorY, size: 10, font: fontRegular });
      page.drawText(`Rs ${item.lineTotal.toFixed(2)}`, { x: 490, y: cursorY, size: 10, font: fontRegular });
      cursorY -= 20;
    }

    // Totals
    cursorY -= 20;
    page.drawLine({ start: { x: 300, y: cursorY + 10 }, end: { x: width - 50, y: cursorY + 10 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    
    page.drawText("Subtotal:", { x: 350, y: cursorY - 10, size: 10, font: fontRegular });
    page.drawText(`Rs ${invoice.subtotal.toFixed(2)}`, { x: 490, y: cursorY - 10, size: 10, font: fontRegular });
    
    if (invoice.taxTotal > 0) {
      cursorY -= 20;
      page.drawText("Tax Total:", { x: 350, y: cursorY - 10, size: 10, font: fontRegular });
      page.drawText(`Rs ${invoice.taxTotal.toFixed(2)}`, { x: 490, y: cursorY - 10, size: 10, font: fontRegular });
    }
    
    if (invoice.discount > 0) {
      cursorY -= 20;
      page.drawText("Discount:", { x: 350, y: cursorY - 10, size: 10, font: fontRegular });
      page.drawText(`- Rs ${invoice.discount.toFixed(2)}`, { x: 490, y: cursorY - 10, size: 10, font: fontRegular });
    }
    
    cursorY -= 30;
    page.drawText("GRAND TOTAL:", { x: 350, y: cursorY, size: 12, font: fontBold });
    page.drawText(`Rs ${invoice.total.toFixed(2)}`, { x: 490, y: cursorY, size: 12, font: fontBold });

    // Footer Comments
    if (invoice.customerNotes) {
      cursorY -= 40;
      page.drawText("Notes:", { x: 50, y: cursorY, size: 10, font: fontBold });
      cursorY -= 15;
      page.drawText(invoice.customerNotes, { x: 50, y: cursorY, size: 10, font: fontRegular });
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNo}.pdf"`,
      },
      status: 200,
    });
  } catch (err: any) {
    console.error("PDF Generate error:", err);
    return new NextResponse("Failed to generate PDF: " + err.message, { status: 500 });
  }
}
