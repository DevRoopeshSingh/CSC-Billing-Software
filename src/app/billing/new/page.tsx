"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ipc, isBridgeAvailable } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { api, ApiError } from "@/lib/api-client";
import { API } from "@/lib/api-routes";
import { useToast } from "@/components/Toast";
import { useCanWrite } from "@/lib/permissions";
import type { Service, Customer } from "@/shared/types";

interface CenterApi {
  defaultPaymentMode: string;
}
import { InvoiceFormUI } from "@/components/billing/InvoiceFormUI";
import {
  useInvoiceState,
  useInvoiceTotals,
  buildInvoicePayload,
} from "@/components/billing/useInvoiceState";
import { Lock, Loader2 } from "lucide-react";

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const canWrite = useCanWrite();

  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<"save" | "draft" | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [hasBridge, setHasBridge] = useState<boolean | null>(null);

  useEffect(() => {
    setHasBridge(isBridgeAvailable());
  }, []);

  const { state, actions } = useInvoiceState();
  const totals = useInvoiceTotals(state.lineItems, state.discount);

  // Stable ref so the fetch effect doesn't re-run when the actions object
  // reference changes on re-render (plain object literal = new ref every time).
  const setPaymentModeRef = useRef(actions.setPaymentMode);
  setPaymentModeRef.current = actions.setPaymentMode;

  useEffect(() => {
    (async () => {
      try {
        const [svcs, center] = await Promise.all([
          api.get<Service[]>(API.SERVICES),
          api.get<CenterApi | null>(API.CENTER).catch(() => null),
        ]);
        setServices((svcs ?? []).filter((s) => s.isActive));
        if (center?.defaultPaymentMode) {
          setPaymentModeRef.current(
            center.defaultPaymentMode as "Cash" | "UPI" | "Card" | "Other"
          );
        }
      } catch (err) {
        toast(
          err instanceof ApiError ? err.message : "Failed to load services",
          "error"
        );
      }
    })();
  }, [toast]); // 'actions' removed — it's a new object ref every render; setPaymentMode accessed via stable ref

  const searchCustomers = useCallback(async (q: string) => {
    try {
      const path = q
        ? `${API.CUSTOMERS_SEARCH}?q=${encodeURIComponent(q)}`
        : API.CUSTOMERS;
      const list = await api.get<Customer[]>(path);
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

  const handleSubmit = async (status: "PAID" | "PENDING", printOnSave = false) => {
    setActionLoading(status === "PAID" ? "save" : "draft");
    try {
      const payload = buildInvoicePayload(state, status);
      const result = await api.post<{ id: number; invoiceNo: string }>(
        API.INVOICES,
        payload
      );
      toast(`Invoice ${result.invoiceNo} created`, "success");
      
      if (printOnSave) {
        if (!isBridgeAvailable()) {
          window.open(`/print/${result.id}`, "_blank", "width=400,height=600");
        } else {
          ipc(IPC.PRINTER_PRINT_RECEIPT, result.id).catch(console.error);
        }
      }
      
      router.push(`/invoices/${result.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create invoice";
      toast(msg, "error");
      if (msg.includes("active shift")) {
        router.push("/shifts");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreview = async () => {
    if (previewing) return;
    if (!isBridgeAvailable()) {
      toast("PDF preview is only available in the desktop app", "info");
      return;
    }
    setPreviewing(true);
    try {
      // Same payload shape as save — buildInvoicePayload throws if customer
      // or line items are missing, so the preview gives the same validation
      // feedback as save would.
      const payload = buildInvoicePayload(state, "PENDING");
      await ipc(IPC.INVOICES_PREVIEW_PDF, payload);
      toast("Preview opened in your PDF viewer", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to generate preview",
        "error"
      );
    } finally {
      setPreviewing(false);
    }
  };

  useEffect(() => {
    if (!canWrite) router.replace("/invoices");
  }, [canWrite, router]);

  if (!canWrite) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Lock className="h-8 w-8" />
        <p className="text-sm">Read-only role: invoice creation is disabled.</p>
      </div>
    );
  }

  if (hasBridge === null) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
      onPreview={hasBridge ? handlePreview : undefined}
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
