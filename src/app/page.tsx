import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/formatters";
import DashboardCharts from "./DashboardCharts";

async function getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [customerCount, serviceCount, invoiceCount, recentInvoices, todayInvoices, centerProfile] =
    await Promise.all([
      prisma.customer.count(),
      prisma.service.count({ where: { isActive: true } }),
      prisma.invoice.count(),
      prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { customer: true },
      }),
      prisma.invoice.findMany({
        where: { createdAt: { gte: today }, status: { not: "CANCELLED" } },
        select: { total: true, paymentMode: true },
      }),
      prisma.centerProfile.findUnique({ where: { id: 1 } }),
    ]);

  const totalRevenue = await prisma.invoice.aggregate({
    where: { status: { not: "CANCELLED" } },
    _sum: { total: true },
  });

  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // Revenue By Day (Last 7 Days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentRevenueInvoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: sevenDaysAgo }, status: { not: "CANCELLED" } },
    select: { createdAt: true, total: true },
  });

  const revenueMap: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    revenueMap[d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })] = 0;
  }

  recentRevenueInvoices.forEach(inv => {
    const d = inv.createdAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    if (revenueMap[d] !== undefined) revenueMap[d] += inv.total;
  });

  const revenueData = Object.entries(revenueMap).map(([date, total]) => ({ date, total }));

  // Payment Modes Today
  const paymentMap = todayInvoices.reduce((acc, inv) => {
    acc[inv.paymentMode] = (acc[inv.paymentMode] || 0) + inv.total;
    return acc;
  }, {} as Record<string, number>);

  const paymentData = Object.entries(paymentMap).map(([name, value]) => ({ name, value }));

  return {
    customerCount,
    serviceCount,
    invoiceCount,
    recentInvoices,
    totalRevenue: totalRevenue._sum.total ?? 0,
    todayRevenue,
    todayInvoiceCount: todayInvoices.length,
    revenueData,
    paymentData,
    lastBackupDate: centerProfile?.lastBackupDate ?? null,
  };
}

export default async function HomePage() {
  const profile = await prisma.centerProfile.findUnique({ where: { id: 1 } });
  if (!profile || !profile.centerName) {
    redirect("/wizard");
  }

  const stats = await getStats();

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/reports" className="btn btn-ghost">
            📊 Reports
          </Link>
          <button onClick={() => window.open("/api/export/csv", "_blank")} className="btn btn-ghost">
            ⬇ Export CSV
          </button>
          <Link href="/billing/new" className="btn btn-primary">
            + New Bill
          </Link>
        </div>
      </div>

      <DashboardCharts revenueData={stats.revenueData} paymentData={stats.paymentData} />

      {/* Backup Reminder */}
      {(!stats.lastBackupDate || new Date().getTime() - new Date(stats.lastBackupDate).getTime() > 7 * 24 * 60 * 60 * 1000) && (
        <div className="alert alert-error no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>
            <strong>Backup Reminder:</strong> You haven&apos;t backed up your data recently. Protect your records!
          </span>
          <Link href="/settings/backup" className="btn btn-danger btn-sm">
            Backup Now
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(stats.todayRevenue)}
        />
        <StatCard
          label="Today's Bills"
          value={String(stats.todayInvoiceCount)}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
        />
        <StatCard
          label="Total Customers"
          value={String(stats.customerCount)}
        />
      </div>

      {/* Recent Invoices */}
      <div className="card">
        <div className="flex items-center justify-between mb-16">
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Recent Invoices</h3>
        </div>
        {stats.recentInvoices.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: "32px 0" }}>
            No invoices yet.{" "}
            <Link href="/billing/new" style={{ color: "#1a56db" }}>
              Create your first bill →
            </Link>
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Payment</th>
                  <th className="text-right">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stats.recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <span className="badge badge-teal">
                        INV-{String(inv.id).padStart(4, "0")}
                      </span>
                    </td>
                    <td>{inv.customer.name}</td>
                    <td>
                      <span className={`badge ${inv.status === "PAID" ? "badge-green" : inv.status === "CANCELLED" ? "badge-red" : "badge-yellow"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      {formatDate(inv.createdAt)}
                    </td>
                    <td>{inv.paymentMode}</td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="text-right">
                      <a href={`/invoice/${inv.id}?print=true`} target="_blank" className="btn btn-ghost btn-sm" style={{ marginRight: 8, padding: "5px 8px" }} title="Print Directly">
                        🖨️
                      </a>
                      <Link href={`/invoice/${inv.id}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="card"
      style={{
        marginBottom: 0,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)"
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", marginTop: 12 }}>
        {value}
      </p>
    </div>
  );
}
