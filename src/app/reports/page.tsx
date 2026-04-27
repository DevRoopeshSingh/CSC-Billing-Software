"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { ipc, IpcError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import {
  buildCsv,
  downloadCsv,
  CSV_ROW_LIMIT,
  type CsvColumn,
} from "@/lib/csv";
import {
  Calendar,
  Download,
  Loader2,
  Receipt,
  TrendingUp,
  Wallet,
  Hourglass,
  AlertTriangle,
} from "lucide-react";

type ReportSummary = {
  totals: {
    invoiceCount: number;
    subtotal: number;
    taxTotal: number;
    discount: number;
    revenue: number;
  };
  byStatus: Record<"PAID" | "PENDING" | "CANCELLED", { count: number; total: number }>;
  byPaymentMode: Array<{ paymentMode: string; count: number; total: number }>;
};

type TopCustomer = {
  customerId: number;
  customerName: string;
  invoiceCount: number;
  revenue: number;
};

type TopService = {
  serviceId: number;
  serviceName: string;
  category: string;
  qty: number;
  revenue: number;
};

type PendingDues = { count: number; total: number };

type RangeInvoice = {
  id: number;
  invoiceNo: string;
  createdAt: string | Date;
  customer: { name?: string; mobile?: string } | null;
  status: string;
  paymentMode: string;
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
};

type Preset = "today" | "yesterday" | "last7" | "thisMonth" | "custom";

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presetRange(preset: Exclude<Preset, "custom">): {
  start: string;
  end: string;
} {
  const now = new Date();
  if (preset === "today") {
    const s = isoDate(now);
    return { start: s, end: s };
  }
  if (preset === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    const s = isoDate(d);
    return { start: s, end: s };
  }
  if (preset === "last7") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { start: isoDate(start), end: isoDate(now) };
  }
  // thisMonth
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: isoDate(start), end: isoDate(now) };
}

function Bar({
  label,
  value,
  total,
  accent,
}: {
  label: string;
  value: number;
  total: number;
  accent: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {formatCurrency(value)} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-background">
        <div
          className={cn("h-full rounded-full", accent)}
          style={{ width: `${pct}%` }}
        />
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
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn("rounded-lg p-2.5", accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [preset, setPreset] = useState<Preset>("last7");
  const [range, setRange] = useState(() => presetRange("last7"));
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [pendingDues, setPendingDues] = useState<PendingDues>({
    count: 0,
    total: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, tc, ts, pd] = await Promise.all([
        ipc<ReportSummary>(IPC.REPORTS_SUMMARY, range),
        ipc<TopCustomer[]>(IPC.REPORTS_TOP_CUSTOMERS, { ...range, limit: 5 }),
        ipc<TopService[]>(IPC.REPORTS_TOP_SERVICES, { ...range, limit: 5 }),
        ipc<PendingDues>(IPC.REPORTS_PENDING_DUES),
      ]);
      setSummary(s);
      setTopCustomers(tc ?? []);
      setTopServices(ts ?? []);
      setPendingDues(pd ?? { count: 0, total: 0 });
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to load reports",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [range, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const choosePreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p));
  };

  const setStart = (start: string) => {
    setPreset("custom");
    setRange((r) => ({ ...r, start }));
  };
  const setEnd = (end: string) => {
    setPreset("custom");
    setRange((r) => ({ ...r, end }));
  };

  const paymentTotal = useMemo(
    () => (summary?.byPaymentMode ?? []).reduce((s, r) => s + r.total, 0),
    [summary]
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = (await ipc<RangeInvoice[]>(
        IPC.REPORTS_RANGE,
        range.start,
        range.end
      )) ?? [];
      if (rows.length === 0) {
        toast("No invoices in this range to export", "info");
        return;
      }

      const columns: CsvColumn<RangeInvoice>[] = [
        { header: "invoiceNo", get: (r) => r.invoiceNo },
        {
          header: "createdAt",
          get: (r) => (r.createdAt ? new Date(r.createdAt) : null),
        },
        { header: "customerName", get: (r) => r.customer?.name ?? "" },
        { header: "customerMobile", get: (r) => r.customer?.mobile ?? "" },
        { header: "status", get: (r) => r.status },
        { header: "paymentMode", get: (r) => r.paymentMode },
        { header: "subtotal", get: (r) => r.subtotal },
        { header: "taxTotal", get: (r) => r.taxTotal },
        { header: "discount", get: (r) => r.discount },
        { header: "total", get: (r) => r.total },
        { header: "currency", get: () => "INR" },
      ];

      const { csv, truncated, rowCount } = buildCsv(rows, columns);
      downloadCsv(`invoices_${range.start}_${range.end}.csv`, csv);

      if (truncated) {
        toast(
          `Exported first ${rowCount.toLocaleString()} of ${rows.length.toLocaleString()} rows (cap: ${CSV_ROW_LIMIT.toLocaleString()})`,
          "info"
        );
      } else {
        toast(`Exported ${rowCount.toLocaleString()} rows`, "success");
      }
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to export CSV",
        "error"
      );
    } finally {
      setExporting(false);
    }
  };

  const presetButton = (key: Preset, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => choosePreset(key)}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        preset === key
          ? "bg-primary text-white"
          : "text-muted-foreground hover:bg-background"
      )}
    >
      {label}
    </button>
  );

  const totals = summary?.totals;
  const avg =
    totals && totals.invoiceCount > 0 ? totals.revenue / totals.invoiceCount : 0;

  const isEmpty =
    !loading &&
    (!totals || totals.invoiceCount === 0) &&
    topCustomers.length === 0 &&
    topServices.length === 0;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue, payment, and service performance.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || loading}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2",
            "text-[13px] font-medium text-foreground transition-colors hover:bg-background",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
          {presetButton("today", "Today")}
          {presetButton("yesterday", "Yesterday")}
          {presetButton("last7", "Last 7 days")}
          {presetButton("thisMonth", "This Month")}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={range.start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={range.end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-20">
          <Receipt className="h-10 w-10 text-muted-foreground/40" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              No activity in this range
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a wider range or create your first invoice.
            </p>
          </div>
          <Link
            href="/billing/new"
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark"
          >
            New Invoice
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Revenue"
              value={formatCurrency(totals?.revenue ?? 0)}
              sub={`${totals?.invoiceCount ?? 0} invoices`}
              icon={TrendingUp}
              accent="bg-emerald-50 text-emerald-600"
            />
            <Tile
              label="Avg Invoice"
              value={formatCurrency(avg)}
              sub="In selected range"
              icon={Receipt}
              accent="bg-teal-50 text-teal-600"
            />
            <Tile
              label="Tax Collected"
              value={formatCurrency(totals?.taxTotal ?? 0)}
              sub={`Discount: ${formatCurrency(totals?.discount ?? 0)}`}
              icon={Wallet}
              accent="bg-blue-50 text-blue-600"
            />
            <Tile
              label="Pending Dues"
              value={formatCurrency(pendingDues.total)}
              sub={`${pendingDues.count} open · all-time`}
              icon={Hourglass}
              accent="bg-amber-50 text-amber-600"
            />
          </div>

          {summary && summary.byStatus.CANCELLED.count > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              {summary.byStatus.CANCELLED.count} cancelled invoice
              {summary.byStatus.CANCELLED.count === 1 ? "" : "s"} in range —
              excluded from revenue.
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground">
                Status Breakdown
              </h3>
              <div className="space-y-3">
                <Bar
                  label="Paid"
                  value={summary?.byStatus.PAID.total ?? 0}
                  total={(summary?.byStatus.PAID.total ?? 0) +
                    (summary?.byStatus.PENDING.total ?? 0)}
                  accent="bg-emerald-500"
                />
                <Bar
                  label="Pending"
                  value={summary?.byStatus.PENDING.total ?? 0}
                  total={(summary?.byStatus.PAID.total ?? 0) +
                    (summary?.byStatus.PENDING.total ?? 0)}
                  accent="bg-amber-500"
                />
              </div>
              <div className="mt-4 flex justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>
                  Paid: {summary?.byStatus.PAID.count ?? 0} · Pending:{" "}
                  {summary?.byStatus.PENDING.count ?? 0}
                </span>
                <span>
                  Cancelled: {summary?.byStatus.CANCELLED.count ?? 0}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground">
                Payment Modes
              </h3>
              {summary && summary.byPaymentMode.length > 0 ? (
                <div className="space-y-3">
                  {summary.byPaymentMode.map((m) => (
                    <Bar
                      key={m.paymentMode}
                      label={m.paymentMode}
                      value={m.total}
                      total={paymentTotal}
                      accent="bg-primary"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No payments recorded.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                  Top Customers
                </h3>
              </div>
              {topCustomers.length === 0 ? (
                <p className="px-5 py-6 text-xs text-muted-foreground">
                  No customers billed in this range.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-2.5">Customer</th>
                      <th className="px-5 py-2.5 text-right">Invoices</th>
                      <th className="px-5 py-2.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((c) => (
                      <tr
                        key={c.customerId}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="px-5 py-2.5 font-medium text-foreground">
                          <Link
                            href={`/invoices?customerId=${c.customerId}`}
                            className="hover:text-primary hover:underline"
                          >
                            {c.customerName}
                          </Link>
                        </td>
                        <td className="px-5 py-2.5 text-right text-foreground">
                          {c.invoiceCount}
                        </td>
                        <td className="px-5 py-2.5 text-right font-semibold text-emerald-600">
                          {formatCurrency(c.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                  Top Services
                </h3>
              </div>
              {topServices.length === 0 ? (
                <p className="px-5 py-6 text-xs text-muted-foreground">
                  No services billed in this range.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-2.5">Service</th>
                      <th className="px-5 py-2.5 text-right">Qty</th>
                      <th className="px-5 py-2.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topServices.map((s) => (
                      <tr
                        key={s.serviceId}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="px-5 py-2.5">
                          <p className="font-medium text-foreground">
                            {s.serviceName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {s.category}
                          </p>
                        </td>
                        <td className="px-5 py-2.5 text-right text-foreground">
                          {s.qty}
                        </td>
                        <td className="px-5 py-2.5 text-right font-semibold text-emerald-600">
                          {formatCurrency(s.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
