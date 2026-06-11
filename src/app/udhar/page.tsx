"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { api, ApiError } from "@/lib/api-client";
import { API } from "@/lib/api-routes";
import { useToast } from "@/components/Toast";
import type { InvoiceDetail } from "@/shared/types";
import { Eye, DollarSign, Clock, Search, BookOpen, AlertCircle, Phone, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanWrite } from "@/lib/permissions";

const fetcher = (url: string) => api.get<InvoiceDetail[]>(url);

function UdharContent() {
  const { toast } = useToast();
  const canWrite = useCanWrite();
  const searchParams = useSearchParams();
  const router = useRouter();

  const qParam = searchParams.get("q") || "";
  const sortFieldParam = (searchParams.get("sortField") as "createdAt" | "balanceAmount") || "createdAt";
  const sortAscParam = searchParams.get("sortAsc") === "true";

  const [search, setSearch] = useState(qParam);
  const [debouncedSearch, setDebouncedSearch] = useState(qParam);
  const [sortField, setSortField] = useState<"createdAt" | "balanceAmount">(sortFieldParam);
  const [sortAsc, setSortAsc] = useState(sortAscParam);

  useEffect(() => {
    setSearch(qParam);
    setSortField(sortFieldParam);
    setSortAsc(sortAscParam);
  }, [qParam, sortFieldParam, sortAscParam]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("q", search);
      else params.delete("q");
      if (sortField !== "createdAt") params.set("sortField", sortField);
      else params.delete("sortField");
      if (sortAsc) params.set("sortAsc", "true");
      else params.delete("sortAsc");
      
      if (params.toString() !== searchParams.toString()) {
        router.replace(`/udhar?${params.toString()}`, { scroll: false });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, sortField, sortAsc, searchParams, router]);

  const qs = searchParams.toString();
  const getInvoiceUrl = (id?: number) => `/invoices/${id}?returnTo=/udhar${qs ? `&${qs}` : ""}`;

  const [paymentModalData, setPaymentModalData] = useState<InvoiceDetail | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: invoices = [], isLoading, mutate } = useSWR<InvoiceDetail[]>(
    API.REPORTS_UDHAR,
    fetcher,
    { onError: (err) => toast(err instanceof ApiError ? err.message : "Failed to load udhar invoices", "error") }
  );

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = invoices.filter((inv) => {
      if (!debouncedSearch) return true;
      return (
        inv.invoiceNo.toLowerCase().includes(debouncedSearch) ||
        (inv.customer?.name ?? "").toLowerCase().includes(debouncedSearch) ||
        (inv.customer?.mobile ?? "").toLowerCase().includes(debouncedSearch)
      );
    });

    return filtered.sort((a, b) => {
      const aVal = sortField === "createdAt" ? new Date(a.createdAt!).getTime() : a.balanceAmount;
      const bVal = sortField === "createdAt" ? new Date(b.createdAt!).getTime() : b.balanceAmount;
      return sortAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [invoices, debouncedSearch, sortField, sortAsc]);

  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

  const getAgingDays = (dateStr: string | Date | undefined) => {
    if (!dateStr) return 0;
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const getAgingColor = (days: number) => {
    if (days > 30) return "text-red-600 bg-red-50 border-red-200";
    if (days > 15) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalData || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast("Please enter a valid amount", "error");
      return;
    }
    if (amount > paymentModalData.balanceAmount) {
      toast("Amount cannot exceed the balance", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/api/payments", {
        invoiceId: paymentModalData.id,
        amount,
        paymentMode,
      });
      toast("Payment recorded successfully", "success");
      mutate();
      setPaymentModalData(null);
      setPaymentAmount("");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed to record payment", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Udhar Dashboard
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `Manage outstanding balances across ${invoices.length} invoices`}
          </p>
        </div>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                  Total Outstanding
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {formatCurrency(totalOutstanding)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Invoices Pending
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {invoices.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  Avg Aging (Days)
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {invoices.length ? Math.floor(invoices.reduce((s, i) => s + getAgingDays(i.createdAt), 0) / invoices.length) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
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
              "w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            )}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading udhar records...</p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No outstanding invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th 
                    className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => {
                      setSortField("createdAt");
                      setSortAsc(sortField === "createdAt" ? !sortAsc : false);
                    }}
                  >
                    Invoice & Date {sortField === "createdAt" && (sortAsc ? "↑" : "↓")}
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Customer Details
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                    Aging
                  </th>
                  <th 
                    className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => {
                      setSortField("balanceAmount");
                      setSortAsc(sortField === "balanceAmount" ? !sortAsc : false);
                    }}
                  >
                    Balance {sortField === "balanceAmount" && (sortAsc ? "↑" : "↓")}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((inv) => {
                  const agingDays = getAgingDays(inv.createdAt);
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/20"
                    >
                      <td className="px-6 py-4">
                        <Link href={getInvoiceUrl(inv.id)} className="font-semibold text-primary hover:underline">
                          {inv.invoiceNo}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-1">
                          {inv.createdAt ? formatDate(inv.createdAt) : "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">
                          {inv.customer?.name ?? "—"}
                        </p>
                        {inv.customer?.mobile && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {inv.customer.mobile}
                            </span>
                            <a
                              href={`https://wa.me/91${inv.customer.mobile.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(inv.customer.name)},%20Your%20invoice%20${inv.invoiceNo}%20has%20a%20pending%20balance%20of%20${formatCurrency(inv.balanceAmount)}.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="Remind on WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                          getAgingColor(agingDays)
                        )}>
                          <Clock className="h-3.5 w-3.5" />
                          {agingDays} Days
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-semibold text-red-600 dark:text-red-400 text-base">
                          {formatCurrency(inv.balanceAmount)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          of {formatCurrency(inv.total)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {canWrite && (
                          <button
                            onClick={() => {
                              setPaymentModalData(inv);
                              setPaymentAmount(inv.balanceAmount.toString());
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-primary-dark active:scale-95"
                          >
                            <DollarSign className="h-4 w-4" />
                            Receive
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border">
            <h3 className="text-xl font-bold text-foreground mb-1">Record Payment</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Invoice: <span className="font-semibold text-foreground">{paymentModalData.invoiceNo}</span>
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">
                  Amount Received (Max: {formatCurrency(paymentModalData.balanceAmount)})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={paymentModalData.balanceAmount}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentModalData(null)}
                  disabled={isSubmitting}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UdharPage() {
  return (
    <Suspense fallback={
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    }>
      <UdharContent />
    </Suspense>
  );
}
