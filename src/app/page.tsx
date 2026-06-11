"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { format } from "date-fns";
import { api } from "@/lib/api-client";
import { API } from "@/lib/api-routes";
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
  PieChart,
} from "lucide-react";

type ReportSummary = {
  totals: {
    invoiceCount: number;
    subtotal: number;
    taxTotal: number;
    discount: number;
    revenue: number;
    grossCollection?: number;
    governmentCharges?: number;
    expenses?: number;
    netEarnings?: number;
    totalCashCollected?: number;
    udharIssued?: number;
    netProfit?: number;
  };
  byPaymentMode?: { paymentMode: string; count: number; total: number }[];
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

function TileSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-3 w-full">
          <div className="h-3 w-20 animate-pulse rounded bg-muted"></div>
          <div className="h-8 w-32 animate-pulse rounded bg-muted"></div>
          <div className="h-3 w-24 animate-pulse rounded bg-muted"></div>
        </div>
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-muted"></div>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  loading?: boolean;
}) {
  if (loading) return <TileSkeleton />;
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <div className="mt-3 text-3xl font-bold text-foreground">{value}</div>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn("rounded-xl p-3", accent)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function RealTimeClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
      <Clock className="h-4 w-4 text-primary animate-pulse" />
      <span className="text-sm font-medium tabular-nums text-foreground">
        {format(time, "hh:mm:ss a")}
      </span>
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
  const [todayGrossCollection, setTodayGrossCollection] = useState(0);
  const [todayGovCharges, setTodayGovCharges] = useState(0);
  const [todayNetEarnings, setTodayNetEarnings] = useState(0); // This is booked sales
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [todayNetProfit, setTodayNetProfit] = useState(0); // This is Net Cash Position
  const [todayCashCollected, setTodayCashCollected] = useState(0);
  const [todayUdharIssued, setTodayUdharIssued] = useState(0);
  const [pendingDues, setPendingDues] = useState<PendingDues>({
    count: 0,
    total: 0,
  });
  const [avgInvoice, setAvgInvoice] = useState(0);
  const [paymentModes, setPaymentModes] = useState<{paymentMode: string, count: number, total: number}[]>([]);
  const [recent, setRecent] = useState<RecentInvoice[]>([]);
  const lastLoadedDateRef = useRef<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const today = isoDate(new Date());
      lastLoadedDateRef.current = today;
      const [todaySummary, dues, allInvoices] = await Promise.all([
        api.get<ReportSummary>(
          `${API.REPORTS_SUMMARY}?start=${today}&end=${today}`
        ),
        api.get<PendingDues>(API.REPORTS_PENDING_DUES),
        api.get<InvoiceDetail[]>(API.INVOICES),
      ]);

      const t = todaySummary?.totals;
      setTodayCount(t?.invoiceCount ?? 0);
      setTodayGrossCollection(t?.grossCollection ?? 0);
      setTodayGovCharges(t?.governmentCharges ?? 0);
      setTodayNetEarnings(t?.netEarnings ?? 0);
      setTodayExpenses(t?.expenses ?? 0);
      setTodayCashCollected(t?.totalCashCollected ?? 0);
      setTodayUdharIssued(t?.udharIssued ?? 0);
      setTodayNetProfit(t?.netProfit ?? 0);
      setPendingDues(dues ?? { count: 0, total: 0 });
      setAvgInvoice(t && t.invoiceCount > 0 ? t.revenue / t.invoiceCount : 0);
      setPaymentModes(todaySummary?.byPaymentMode ?? []);

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">{greeting}</h2>
            <RealTimeClock />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Today at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/reports"
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5",
              "text-[13px] font-medium text-foreground transition-colors hover:bg-background shadow-sm hover:shadow"
            )}
          >
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Reports
          </Link>
          <Link
            href="/billing/new"
            className={cn(
              "flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 shadow-sm hover:shadow",
              "text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark"
            )}
          >
            <FilePlus className="h-4 w-4" />
            New Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          label="Today's Cash Collection"
          value={formatCurrency(todayCashCollected)}
          loading={loading}
          sub={`Actual money received today`}
          icon={IndianRupee}
          accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <Tile
          label="Net Cash Position"
          value={formatCurrency(todayNetProfit)}
          loading={loading}
          sub={`Collection: ${formatCurrency(todayCashCollected)} | Expenses: ${formatCurrency(todayExpenses)}`}
          icon={Wallet}
          accent="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        />
        <Tile
          label="Today's Expenses"
          value={formatCurrency(todayExpenses)}
          loading={loading}
          icon={Receipt}
          accent="bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
        />
        <Tile
          label="Sales Booked Today"
          value={formatCurrency(todayGrossCollection)}
          loading={loading}
          sub={`${todayCount} invoices (Accrual)`}
          icon={BarChart3}
          accent="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <Tile
          label="Udhar Issued Today"
          value={formatCurrency(todayUdharIssued)}
          loading={loading}
          sub="New credit given today"
          icon={FileWarning}
          accent="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
        />
        <Tile
          label="Total Pending Dues"
          value={formatCurrency(pendingDues.total)}
          loading={loading}
          sub={`${pendingDues.count} open · all-time`}
          icon={Hourglass}
          accent="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
      </div>

      {paymentModes.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Today's Payment Breakdown
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {paymentModes.map((pm) => (
              <div key={pm.paymentMode} className="rounded-lg bg-background p-3 border border-border">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{pm.paymentMode}</p>
                <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(pm.total)}</p>
                <p className="text-[10px] text-muted-foreground">{pm.count} {pm.count === 1 ? 'invoice' : 'invoices'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between items-center rounded-lg border border-border p-3">
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
                  <div className="h-3 w-32 animate-pulse rounded bg-muted"></div>
                </div>
                <div className="h-6 w-16 animate-pulse rounded bg-muted"></div>
              </div>
            ))}
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
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden">
              <div className="flex flex-col divide-y divide-border/50">
                {recent.map((inv) => (
                  <div key={inv.id} className="flex flex-col gap-2 p-4 hover:bg-background/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inv.invoiceNo}
                      </Link>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{inv.customerName}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(inv.total)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(inv.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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
          </>
        )}
      </div>
    </div>
  );
}
