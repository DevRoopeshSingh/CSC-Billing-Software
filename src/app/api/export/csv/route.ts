import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const where: any = {};

    if (start && end) {
      // Create date objects. For end date, we want to include the whole day.
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        where.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
      },
    });

    // Generate CSV Header
    const headers = ["Invoice ID", "Date", "Customer Name", "Customer Mobile", "Subtotal", "Tax", "Discount", "Total", "Payment Mode", "Status", "Notes"];
    
    // Create CSV rows
    const rows = invoices.map(inv => {
      const date = inv.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
      return [
        `INV-${String(inv.id).padStart(4, "0")}`,
        date,
        `"${inv.customer.name.replace(/"/g, '""')}"`, // Quote strings to escape commas inside names
        inv.customer.mobile,
        inv.subtotal.toFixed(2),
        inv.taxTotal.toFixed(2),
        inv.discount.toFixed(2),
        inv.total.toFixed(2),
        inv.paymentMode,
        inv.status,
        `"${(inv.notes || "").replace(/"/g, '""')}"`
      ].join(",");
    });

    const csvOutput = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csvOutput, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="invoices_export_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error("Failed to generate CSV export:", error);
    return NextResponse.json({ error: "Failed to generate CSV" }, { status: 500 });
  }
}
