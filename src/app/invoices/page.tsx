// src/app/invoices/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ipc, IpcError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import type { InvoiceDetail } from "@/shared/types";
import {
  buildCsv,
  downloadCsv,
  CSV_ROW_LIMIT,
  type CsvColumn,
} from "@/lib/csv";
import {
  Search,
  FilePlus,
  FileText,
  Eye,
  Filter,
  ChevronDown,
  Download,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const STATUS_OPTIONS = ["ALL", "PAID", "PENDING", "CANCELLED"] as const;

function InvoicesContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const customerIdFilter = searchParams.get("customerId");

  const [invoices, setInvoices] = useState<InvoiceDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ipc<InvoiceDetail[]>(IPC.INVOICES_LIST);
      setInvoices(list ?? []);
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to load invoices",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const updateStatus = async (
    id: number,
    newStatus: "PAID" | "PENDING" | "CANCELLED"
  ) => {
    if (newStatus === "CANCELLED") {
      // Cancellation needs admin+PIN; route through the detail page so the
      // PIN modal flow stays in one place.
      router.push(`/invoices/${id}`);
      return;
    }
    try {
      await ipc(IPC.INVOICES_UPDATE_STATUS, id, newStatus);
      setInvoices((list) =>
        list.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
      );
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to update status",
        "error"
      );
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (customerIdFilter && inv.customerId !== Number(customerIdFilter)) return false;
      if (status !== "ALL" && inv.status !== status) return false;
      if (startDate && inv.createdAt && new Date(inv.createdAt) < new Date(startDate))
        return false;
      if (endDate && inv.createdAt) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(inv.createdAt) > end) return false;
      }
      if (!q) return true;
      return (
        inv.invoiceNo.toLowerCase().includes(q) ||
        (inv.customer?.name ?? "").toLowerCase().includes(q) ||
        (inv.customer?.mobile ?? "").toLowerCase().includes(q)
      );
    });
  }, [invoices, search, status, startDate, endDate, customerIdFilter]);

  const totalAmount = filtered.reduce((s, inv) => s + inv.total, 0);
  const paidCount = filtered.filter((i) => i.status === "PAID").length;
  const pendingCount = filtered.filter((i) => i.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Invoices</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading..."
              : `${filtered.length} invoices | ${paidCount} paid | ${pendingCount} pending`}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (filtered.length === 0) {
                toast("No invoices to export", "info");
                return;
              }
              const columns: CsvColumn<InvoiceDetail>[] = [
                { header: "invoiceNo", get: (r) => r.invoiceNo },
                {
                  header: "createdAt",
                  get: (r) => (r.createdAt ? new Date(r.createdAt) : null),
                },
                { header: "customerName", get: (r) => r.customer?.name ?? "" },
                {
                  header: "customerMobile",
                  get: (r) => r.customer?.mobile ?? "",
                },
                { header: "status", get: (r) => r.status },
                { header: "paymentMode", get: (r) => r.paymentMode },
                { header: "subtotal", get: (r) => r.subtotal },
                { header: "taxTotal", get: (r) => r.taxTotal },
                { header: "discount", get: (r) => r.discount },
                { header: "total", get: (r) => r.total },
                { header: "currency", get: () => "INR" },
              ];
              const { csv, rowCount, truncated } = buildCsv(filtered, columns);
              const stamp = new Date().toISOString().split("T")[0];
              downloadCsv(`invoices_${stamp}.csv`, csv);
              if (truncated) {
                toast(
                  `Exported first ${rowCount.toLocaleString()} of ${filtered.length.toLocaleString()} rows (cap: ${CSV_ROW_LIMIT.toLocaleString()})`,
                  "info"
                );
              } else {
                toast(`Exported ${rowCount.toLocaleString()} rows`, "success");
              }
            }}
            disabled={loading}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5",
              "text-[13px] font-medium text-foreground transition-colors hover:bg-background",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          {user?.role !== "viewer" && (
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
          )}
        </div>
      </div>

      {!loading && filtered.length > 0 && (
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
            <p className="mt-1.5 text-xl font-bold text-emerald-600">
              {paidCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pending
            </p>
            <p className="mt-1.5 text-xl font-bold text-amber-600">
              {pendingCount}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>
        <div
          className="relative flex-1"
          style={{ minWidth: 200, maxWidth: 320 }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoice, customer, mobile..."
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

        {customerIdFilter && (
          <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm text-primary">
            <span className="font-medium">Filtered by Customer ID: {customerIdFilter}</span>
            <button
              onClick={() => router.push("/invoices")}
              className="ml-2 hover:text-primary-dark font-bold"
              title="Clear Filter"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading invoices...</p>
          </div>
        ) : filtered.length === 0 ? (
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
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border/50 last:border-0 transition-colors hover:bg-background/60"
                  >
                    <td className="px-6 py-3.5">
                      <span className="font-semibold text-foreground">
                        {inv.invoiceNo}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground">
                      {inv.createdAt ? formatDate(inv.createdAt) : "—"}
                    </td>
                    <td className="px-6 py-3.5">
                      <div>
                        <p className="font-medium text-foreground">
                          {inv.customer?.name ?? "—"}
                        </p>
                        {inv.customer?.mobile && (
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
                          disabled={user?.role === "viewer"}
                          onChange={(e) =>
                            updateStatus(
                              inv.id!,
                              e.target.value as
                                | "PAID"
                                | "PENDING"
                                | "CANCELLED"
                            )
                          }
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
                        <Link
                          href={`/invoices/${inv.id}`}
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

export default function InvoicesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading invoices...</p>
      </div>
    }>
      <InvoicesContent />
    </Suspense>
  );
}
