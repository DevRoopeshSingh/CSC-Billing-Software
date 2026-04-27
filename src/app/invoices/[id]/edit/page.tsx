"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ipc, IpcError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import type { InvoiceDetail, Service, Customer } from "@/shared/types";
import { InvoiceFormUI } from "@/components/billing/InvoiceFormUI";
import {
  useInvoiceState,
  useInvoiceTotals,
  buildInvoicePayload,
} from "@/components/billing/useInvoiceState";
import { ArrowLeft, Loader2 } from "lucide-react";

function EditInvoiceForm({
  invoice,
  services,
}: {
  invoice: InvoiceDetail;
  services: Service[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState(
    invoice.customer?.name ?? ""
  );
  const [actionLoading, setActionLoading] = useState<"save" | "draft" | null>(
    null
  );

  const { state, actions } = useInvoiceState({
    selectedCustomer: invoice.customer ?? null,
    newCustomerMode: false,
    discount: invoice.discount,
    notes: invoice.notes ?? "",
    customerNotes: invoice.customerNotes ?? "",
    paymentMode: invoice.paymentMode,
    lineItems: invoice.items.map((it) => ({
      _key: 0,
      serviceId: it.serviceId ?? 0,
      description: it.description ?? "",
      qty: it.qty,
      rate: it.rate,
      taxRate: it.taxRate,
    })),
  });

  const totals = useInvoiceTotals(state.lineItems, state.discount);

  const searchCustomers = useCallback(async (q: string) => {
    try {
      const list = await ipc<Customer[]>(
        q ? IPC.CUSTOMERS_SEARCH : IPC.CUSTOMERS_LIST,
        q || undefined
      );
      setCustomers(list ?? []);
    } catch {
      setCustomers([]);
    }
  }, []);

  useEffect(() => {
    searchCustomers(customerSearch);
  }, [customerSearch, searchCustomers]);

  const handleSubmit = async (status: "PAID" | "PENDING") => {
    if (status === "PAID") {
      const ok = window.confirm(
        `Mark ${invoice.invoiceNo} as PAID? This locks the invoice — it cannot be edited again. Use status change later if you only need to revert.`
      );
      if (!ok) return;
    }
    setActionLoading(status === "PAID" ? "save" : "draft");
    try {
      const payload = buildInvoicePayload(state, status);
      await ipc(IPC.INVOICES_UPDATE, invoice.id, payload);
      toast(`Invoice ${invoice.invoiceNo} updated`, "success");
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to update invoice",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <InvoiceFormUI
      mode="edit"
      invoiceNo={invoice.invoiceNo}
      invoiceDate={invoice.createdAt ?? null}
      state={state}
      actions={actions}
      totals={totals}
      services={services}
      customers={customers}
      customerSearch={customerSearch}
      setCustomerSearch={setCustomerSearch}
      onSubmit={handleSubmit}
      actionLoading={actionLoading}
    />
  );
}

function EditInvoiceContent() {
  const params = useParams<{ id: string }>();
  const invoiceId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
      setError("Invoice not found");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [svcs, inv] = await Promise.all([
          ipc<Service[]>(IPC.SERVICES_LIST),
          ipc<InvoiceDetail | undefined>(IPC.INVOICES_GET, invoiceId),
        ]);
        setServices((svcs ?? []).filter((s) => s.isActive));
        if (!inv) {
          setError("Invoice not found");
        } else if (inv.status !== "PENDING") {
          setLocked(true);
          setInvoice(inv);
        } else {
          setInvoice(inv);
        }
      } catch (err) {
        setError(
          err instanceof IpcError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load invoice"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">{error}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The invoice you are trying to edit may have been deleted.
          </p>
        </div>
        <Link
          href="/invoices"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to invoices
        </Link>
      </div>
    );
  }

  if (locked && invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
          <h2 className="text-lg font-semibold">Invoice is locked</h2>
          <p className="mt-2 text-sm">
            <strong>{invoice.invoiceNo}</strong> is{" "}
            <strong>{invoice.status}</strong> and cannot be edited. Only{" "}
            <strong>PENDING</strong> invoices can be modified. To make changes,
            cancel this invoice and reissue a new one.
          </p>
        </div>
        <Link
          href={`/invoices/${invoice.id}`}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to invoice
        </Link>
      </div>
    );
  }

  if (!invoice) return null;

  return <EditInvoiceForm invoice={invoice} services={services} />;
}

export default function EditInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EditInvoiceContent />
    </Suspense>
  );
}
