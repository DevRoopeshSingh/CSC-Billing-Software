// src/renderer/app/invoices/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Search,
  FilePlus,
  FileText,
  Download,
  Eye,
  Printer,
  Filter,
  ChevronDown,
} from "lucide-react";

interface InvoiceSummary {
  id: number;
  invoiceNo?: string;
  createdAt: string;
  total: number;
  status: string;
  paymentMode: string;
  customer: { name: string; mobile: string };
}

const STATUS_OPTIONS = ["ALL", "PAID", "PENDING", "CANCELLED"] as const;

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    CANCELLED: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        styles[status] ?? "border-gray-200 bg-gray-50 text-gray-600"
      )}
    >
      {status}
    </span>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.append("search", search);
      if (status !== "ALL") q.append("status", status);
      if (startDate) q.append("start", startDate);
      if (endDate) q.append("end", endDate);

      const res = await fetch("/api/invoices?" + q.toString());
      if (res.ok) setInvoices(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadInvoices(), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, startDate, endDate]);

  const updateStatus = async (id: number, newStatus: string) => {
    const res = await fetch(`/api/invoices/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) loadInvoices();
  };

  const downloadCsv = () => {
    const q = new URLSearchParams();
    if (startDate) q.append("start", startDate);
    if (endDate) q.append("end", endDate);
    window.open("/api/export/csv?" + q.toString(), "_blank");
  };

  // Summary stats
  const totalAmount = invoices.reduce((s, inv) => s + inv.total, 0);
  const paidCount = invoices.filter((i) => i.status === "PAID").length;
  const pendingCount = invoices.filter((i) => i.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Invoices</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading..."
              : `${invoices.length} invoices | ${paidCount} paid | ${pendingCount} pending`}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={downloadCsv}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5",
              "text-[13px] font-medium text-foreground transition-colors hover:bg-background"
            )}
          >
            <Download className="h-4 w-4 text-muted-foreground" />
            Export CSV
          </button>
          <Link
            href="/billing/new"
            className={cn(
              "flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5",
              "text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark"
            )}
          >
            <FilePlus className="h-4 w-4" />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total Amount
            </p>
            <p className="mt-1.5 text-xl font-bold text-foreground">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Paid
            </p>
            <p className="mt-1.5 text-xl font-bold text-emerald-600">{paidCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pending
            </p>
            <p className="mt-1.5 text-xl font-bold text-amber-600">{pendingCount}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 320 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ID, customer, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}
          />
        </div>
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={cn(
              "appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All Statuses" : s}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={cn(
              "rounded-lg border border-border bg-background px-3 py-2 text-sm",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}
          />
        </div>
        <span className="text-xs text-muted-foreground">to</span>
        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={cn(
              "rounded-lg border border-border bg-background px-3 py-2 text-sm",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}
          />
        </div>
      </div>

      {/* Invoice Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No invoices found</p>
            <Link
              href="/billing/new"
              className="text-xs font-medium text-primary hover:underline"
            >
              Create your first invoice
            </Link>
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
                    Date
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border/50 last:border-0 transition-colors hover:bg-background/60"
                  >
                    <td className="px-6 py-3.5">
                      <span className="font-semibold text-foreground">
                        INV-{String(inv.id).padStart(4, "0")}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="px-6 py-3.5">
                      <div>
                        <p className="font-medium text-foreground">
                          {inv.customer.name}
                        </p>
                        {inv.customer.mobile && (
                          <p className="text-xs text-muted-foreground">
                            {inv.customer.mobile}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="relative inline-block">
                        <select
                          value={inv.status}
                          onChange={(e) => updateStatus(inv.id, e.target.value)}
                          className={cn(
                            "appearance-none rounded-full border px-3 py-1 pr-7 text-[11px] font-semibold",
                            "focus:outline-none focus:ring-2 focus:ring-primary/20",
                            inv.status === "PAID"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : inv.status === "PENDING"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-red-200 bg-red-50 text-red-700"
                          )}
                        >
                          <option value="PAID">PAID</option>
                          <option value="PENDING">PENDING</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2" />
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                        {inv.paymentMode}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-foreground">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={`/invoice/${inv.id}?print=true`}
                          target="_blank"
                          className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                          title="Print"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </a>
                        <Link
                          href={`/invoice/${inv.id}`}
                          className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </div>
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
