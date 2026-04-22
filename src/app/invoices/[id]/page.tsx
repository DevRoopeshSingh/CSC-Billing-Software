// src/app/invoices/[id]/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ipc, IpcError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import type {
  InvoiceDetail,
  InvoiceItem,
  InvoiceStatus,
  Service,
} from "@/shared/types";

type LineItemWithService = InvoiceItem & { service?: Service };
import {
  ArrowLeft,
  Download,
  Printer,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  ChevronDown,
  Loader2,
} from "lucide-react";

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const invoiceId = useMemo(() => {
    const n = Number(params?.id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<"status" | "pdf" | "print" | "delete" | null>(
    null
  );

  const load = useCallback(async () => {
    if (invoiceId === null) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await ipc<InvoiceDetail | undefined>(
        IPC.INVOICES_GET,
        invoiceId
      );
      if (!data) {
        setNotFound(true);
      } else {
        setInvoice(data);
      }
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to load invoice",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [invoiceId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const onStatusChange = async (next: InvoiceStatus) => {
    if (!invoice?.id || invoice.status === next) return;
    setBusy("status");
    try {
      await ipc(IPC.INVOICES_UPDATE_STATUS, invoice.id, next);
      setInvoice({ ...invoice, status: next });
      toast(`Marked ${next.toLowerCase()}`, "success");
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to update status",
        "error"
      );
    } finally {
      setBusy(null);
    }
  };

  const onDownloadPdf = async () => {
    if (!invoice?.id) return;
    setBusy("pdf");
    try {
      const res = await ipc<{ path?: string }>(
        IPC.INVOICES_GENERATE_PDF,
        invoice.id
      );
      toast(
        res?.path ? `Saved to ${res.path}` : "PDF generated",
        "success"
      );
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to generate PDF",
        "error"
      );
    } finally {
      setBusy(null);
    }
  };

  const onPrint = async () => {
    if (!invoice?.id) return;
    setBusy("print");
    try {
      await ipc(IPC.PRINTER_PRINT_RECEIPT, invoice.id);
      toast("Receipt sent to printer", "success");
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to print receipt",
        "error"
      );
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async () => {
    if (!invoice?.id) return;
    if (
      !window.confirm(
        `Delete invoice ${invoice.invoiceNo}? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy("delete");
    try {
      await ipc(IPC.INVOICES_DELETE, invoice.id);
      toast("Invoice deleted", "success");
      router.push("/invoices");
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to delete invoice",
        "error"
      );
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">
            Invoice not found
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The invoice you are looking for may have been deleted.
          </p>
        </div>
        <Link
          href="/invoices"
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2",
            "text-sm font-medium text-foreground hover:bg-background"
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to invoices
        </Link>
      </div>
    );
  }

  const { customer } = invoice;
  const items = (invoice.items ?? []) as LineItemWithService[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card",
              "text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            )}
            title="Back to invoices"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {invoice.invoiceNo}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Created{" "}
              {invoice.createdAt ? formatDate(invoice.createdAt) : "—"} ·{" "}
              {invoice.paymentMode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={invoice.status}
              disabled={busy === "status"}
              onChange={(e) => onStatusChange(e.target.value as InvoiceStatus)}
              className={cn(
                "appearance-none rounded-full border px-4 py-1.5 pr-8 text-xs font-semibold",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60",
                STATUS_CLASSES[invoice.status]
              )}
            >
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2" />
          </div>

          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={busy !== null}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2",
              "text-[13px] font-medium text-foreground transition-colors hover:bg-background",
              "disabled:opacity-60"
            )}
          >
            {busy === "pdf" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            PDF
          </button>

          <button
            type="button"
            onClick={onPrint}
            disabled={busy !== null}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2",
              "text-[13px] font-medium text-foreground transition-colors hover:bg-background",
              "disabled:opacity-60"
            )}
          >
            {busy === "print" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            Print
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={busy !== null}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2",
              "text-[13px] font-medium text-red-700 transition-colors hover:bg-red-100",
              "disabled:opacity-60"
            )}
          >
            {busy === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </button>
        </div>
      </div>

      {/* Customer + Totals */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Billed To
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <User className="h-4 w-4 text-muted-foreground" />
              {customer?.name ?? "—"}
            </div>
            {customer?.mobile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {customer.mobile}
              </div>
            )}
            {customer?.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {customer.email}
              </div>
            )}
            {customer?.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4" />
                <span className="whitespace-pre-wrap">{customer.address}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Summary
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(invoice.subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(invoice.taxTotal)}
              </dd>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="font-medium text-foreground">
                  − {formatCurrency(invoice.discount)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="text-sm font-semibold text-foreground">Total</dt>
              <dd className="text-base font-bold text-foreground">
                {formatCurrency(invoice.total)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Line Items ({items.length})
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Service
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Qty
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rate
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tax %
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id ?? `${item.serviceId}-${item.description}`}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">
                      {item.description}
                    </p>
                    {item.service?.name &&
                      item.service.name !== item.description && (
                        <p className="text-xs text-muted-foreground">
                          {item.service.name}
                        </p>
                      )}
                  </td>
                  <td className="px-5 py-3 text-center text-foreground">
                    {item.qty}
                  </td>
                  <td className="px-5 py-3 text-right text-foreground">
                    {formatCurrency(item.rate)}
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground">
                    {item.taxRate.toFixed(2)}%
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-foreground">
                    {formatCurrency(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {(invoice.notes || invoice.customerNotes) && (
        <div className="grid gap-4 md:grid-cols-2">
          {invoice.customerNotes && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes for Customer
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                {invoice.customerNotes}
              </p>
            </div>
          )}
          {invoice.notes && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Internal Notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
