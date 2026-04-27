"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ipc } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import BookmarkedServices from "@/components/BookmarkedServices";
import type { InvoiceDetail } from "@/shared/types";
import {
  IndianRupee,
  Receipt,
  Hourglass,
  Wallet,
  FilePlus,
  BarChart3,
  Clock,
  FileWarning,
} from "lucide-react";

type ReportSummary = {
  totals: {
    invoiceCount: number;
    subtotal: number;
    taxTotal: number;
    discount: number;
    revenue: number;
  };
};

type PendingDues = { count: number; total: number };

type RecentInvoice = {
  id: number;
  invoiceNo: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string | Date;
};

function Tile({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-3xl font-bold text-foreground">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn("rounded-xl p-3", accent)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        styles[status] ?? "bg-gray-50 text-gray-600 border-gray-200"
      )}
    >
      {status}
    </span>
  );
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [pendingDues, setPendingDues] = useState<PendingDues>({
    count: 0,
    total: 0,
  });
  const [avgInvoice, setAvgInvoice] = useState(0);
  const [recent, setRecent] = useState<RecentInvoice[]>([]);
  const lastLoadedDateRef = useRef<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const today = isoDate(new Date());
      lastLoadedDateRef.current = today;
      const [todaySummary, dues, allInvoices] = await Promise.all([
        ipc<ReportSummary>(IPC.REPORTS_SUMMARY, { start: today, end: today }),
        ipc<PendingDues>(IPC.REPORTS_PENDING_DUES),
        ipc<InvoiceDetail[]>(IPC.INVOICES_LIST),
      ]);

      const t = todaySummary?.totals;
      setTodayCount(t?.invoiceCount ?? 0);
      setTodayRevenue(t?.revenue ?? 0);
      setPendingDues(dues ?? { count: 0, total: 0 });
      setAvgInvoice(t && t.invoiceCount > 0 ? t.revenue / t.invoiceCount : 0);

      setRecent(
        (allInvoices ?? []).slice(0, 5).map((i) => ({
          id: i.id!,
          invoiceNo: i.invoiceNo,
          customerName: i.customer?.name ?? "—",
          total: i.total,
          status: i.status,
          createdAt: i.createdAt ?? new Date(),
        }))
      );
    } catch {
      toast("Unable to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Refetch when the user returns to the window if the local date has
  // rolled over since the last load — keeps "Today's …" tiles honest for
  // an app left open past midnight, without polling.
  useEffect(() => {
    const refetchIfDateChanged = () => {
      if (document.visibilityState !== "visible") return;
      if (lastLoadedDateRef.current && lastLoadedDateRef.current !== isoDate(new Date())) {
        loadDashboard();
      }
    };
    document.addEventListener("visibilitychange", refetchIfDateChanged);
    window.addEventListener("focus", refetchIfDateChanged);
    return () => {
      document.removeEventListener("visibilitychange", refetchIfDateChanged);
      window.removeEventListener("focus", refetchIfDateChanged);
    };
  }, [loadDashboard]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{greeting}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Today at a glance.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            href="/reports"
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5",
              "text-[13px] font-medium text-foreground transition-colors hover:bg-background"
            )}
          >
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Reports
          </Link>
          <Link
            href="/billing/new"
            className={cn(
              "flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5",
              "text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark"
            )}
          >
            <FilePlus className="h-4 w-4" />
            New Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Today's Invoices"
          value={loading ? "—" : String(todayCount)}
          sub="Excluding cancelled"
          icon={Receipt}
          accent="bg-teal-50 text-teal-600"
        />
        <Tile
          label="Today's Revenue"
          value={loading ? "—" : formatCurrency(todayRevenue)}
          icon={IndianRupee}
          accent="bg-emerald-50 text-emerald-600"
        />
        <Tile
          label="Avg Invoice (today)"
          value={loading ? "—" : formatCurrency(avgInvoice)}
          icon={Wallet}
          accent="bg-blue-50 text-blue-600"
        />
        <Tile
          label="Pending Dues"
          value={loading ? "—" : formatCurrency(pendingDues.total)}
          sub={`${pendingDues.count} open · all-time`}
          icon={Hourglass}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      <BookmarkedServices />

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Recent Invoices
            </h3>
          </div>
          <Link
            href="/invoices"
            className="text-xs font-medium text-primary hover:underline"
          >
            View All
          </Link>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : recent.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <FileWarning className="h-10 w-10 text-muted-foreground/40" />
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No invoices yet
              </p>
              <Link
                href="/billing/new"
                className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
              >
                Create your first invoice
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border/50 last:border-0 hover:bg-background/60"
                  >
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-foreground">
                      {inv.customerName}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-foreground">
                      {formatCurrency(inv.total)}
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
