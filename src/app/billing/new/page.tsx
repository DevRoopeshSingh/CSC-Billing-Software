"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ipc, IpcError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import type { Service, Customer, CenterProfile } from "@/shared/types";
import { InvoiceFormUI } from "@/components/billing/InvoiceFormUI";
import {
  useInvoiceState,
  useInvoiceTotals,
  buildInvoicePayload,
} from "@/components/billing/useInvoiceState";

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<"save" | "draft" | null>(null);

  const { state, actions } = useInvoiceState();
  const totals = useInvoiceTotals(state.lineItems, state.discount);

  useEffect(() => {
    (async () => {
      try {
        const [svcs, center] = await Promise.all([
          ipc<Service[]>(IPC.SERVICES_LIST),
          ipc<CenterProfile>(IPC.CENTER_GET),
        ]);
        setServices((svcs ?? []).filter((s) => s.isActive));
        if (center?.defaultPaymentMode) {
          actions.setPaymentMode(
            center.defaultPaymentMode as "Cash" | "UPI" | "Card" | "Other"
          );
        }
      } catch (err) {
        toast(
          err instanceof IpcError ? err.message : "Failed to load services",
          "error"
        );
      }
    })();
  }, [toast, actions]);

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

  useEffect(() => {
    const cid = searchParams.get("customerId");
    if (cid && customers.length > 0 && !state.selectedCustomer) {
      const match = customers.find((c) => String(c.id) === cid);
      if (match) {
        actions.setSelectedCustomer(match);
        setCustomerSearch(match.name);
      }
    }
  }, [searchParams, customers, state.selectedCustomer, actions]);

  useEffect(() => {
    const sid = searchParams.get("serviceId");
    if (sid && services.length > 0) {
      actions.addServiceById(Number(sid), services);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, services]);

  const handleSubmit = async (status: "PAID" | "PENDING") => {
    setActionLoading(status === "PAID" ? "save" : "draft");
    try {
      const payload = buildInvoicePayload(state, status);
      const result = await ipc<{ id: number; invoiceNo: string }>(
        IPC.INVOICES_CREATE,
        payload
      );
      toast(`Invoice ${result.invoiceNo} created`, "success");
      router.push(`/invoices/${result.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create invoice", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreview = () => {
    toast("PDF preview is not implemented yet", "info");
  };

  return (
    <InvoiceFormUI
      mode="create"
      state={state}
      actions={actions}
      totals={totals}
      services={services}
      customers={customers}
      customerSearch={customerSearch}
      setCustomerSearch={setCustomerSearch}
      onSubmit={handleSubmit}
      onPreview={handlePreview}
      actionLoading={actionLoading}
    />
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <NewInvoiceContent />
    </Suspense>
  );
}
