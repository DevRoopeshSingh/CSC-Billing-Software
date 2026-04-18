import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!type || !["daily", "date-range", "service", "customer", "dashboard"].includes(type)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    // ── Dashboard summary ────────────────────────────────────────────────
    if (type === "dashboard") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [customerCount, serviceCount, pendingInvoices, recentInvoices, todayInvoices, totalAgg] =
        await Promise.all([
          prisma.customer.count(),
          prisma.service.count({ where: { isActive: true } }),
          prisma.invoice.count({ where: { status: "PENDING" } }),
          prisma.invoice.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: { customer: true },
          }),
          prisma.invoice.findMany({
            where: { createdAt: { gte: today }, status: { not: "CANCELLED" } },
            select: { total: true },
          }),
          prisma.invoice.aggregate({
            where: { status: { not: "CANCELLED" } },
            _sum: { total: true },
          }),
        ]);

      const todayRevenue = todayInvoices.reduce((s, inv) => s + inv.total, 0);

      return NextResponse.json({
        customerCount,
        serviceCount,
        pendingInvoices,
        todayRevenue,
        todayInvoiceCount: todayInvoices.length,
        totalRevenue: totalAgg._sum.total ?? 0,
        recentInvoices: recentInvoices.map((inv) => ({
          id: inv.id,
          invoiceNo: `INV-${String(inv.id).padStart(4, "0")}`,
          customerName: inv.customer.name,
          total: inv.total,
          status: inv.status,
          paymentMode: inv.paymentMode,
          createdAt: inv.createdAt.toISOString(),
        })),
      });
    }

    const where: any = {};
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        where.createdAt = { gte: startDate, lte: endDate };
      }
    }

    if (type === "daily" || type === "date-range") {
      const invoices = await prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { customer: true },
      });
      return NextResponse.json({ invoices });
    }

    if (type === "service") {
      // Get all invoice items within range
      const items = await prisma.invoiceItem.findMany({
        where: { invoice: where },
        include: { service: true },
      });

      // Group by service
      const serviceStats: Record<number, { name: string; category: string; count: number; revenue: number }> = {};
      
      for (const item of items) {
        if (!serviceStats[item.serviceId]) {
          serviceStats[item.serviceId] = {
            name: item.service.name,
            category: item.service.category,
            count: 0,
            revenue: 0,
          };
        }
        serviceStats[item.serviceId].count += item.qty;
        serviceStats[item.serviceId].revenue += item.lineTotal;
      }

      return NextResponse.json({ stats: Object.values(serviceStats).sort((a, b) => b.revenue - a.revenue) });
    }

    if (type === "customer") {
      // Group by customer
      const customers = await prisma.customer.findMany({
        where: { invoices: { some: where } },
        include: {
          invoices: {
            where,
            select: { total: true },
          },
        },
      });

      const customerStats = customers.map(c => ({
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        invoiceCount: c.invoices.length,
        totalSpent: c.invoices.reduce((sum, inv) => sum + inv.total, 0),
      })).sort((a, b) => b.totalSpent - a.totalSpent);

      return NextResponse.json({ stats: customerStats });
    }

    return NextResponse.json({ error: "Unhandled type" }, { status: 400 });

  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
