import { useState, useMemo } from "react";
import type { Customer, Service } from "@/shared/types";

export interface LineItem {
  _key: number;
  serviceId: number;
  description: string;
  qty: number;
  rate: number;
  taxRate: number;
}

// Module-scoped counter that produces unique row keys across the lifetime
// of the process. Callers passing `initialData.lineItems` may use any
// `_key` value (including 0) — `useInvoiceState` re-stamps every supplied
// row through this counter so React sees stable, unique keys.
let _keyCounter = 0;
export const createLineItem = (service?: Service): LineItem => {
  if (service) {
    return {
      _key: ++_keyCounter,
      serviceId: service.id ?? 0,
      description: service.name,
      qty: 1,
      rate: service.defaultPrice,
      taxRate: service.taxRate,
    };
  }
  return {
    _key: ++_keyCounter,
    serviceId: 0,
    description: "",
    qty: 1,
    rate: 0,
    taxRate: 0,
  };
};

export function useInvoiceTotals(lineItems: LineItem[], discount: number) {
  return useMemo(() => {
    const sub = lineItems.reduce((s, r) => s + r.qty * r.rate, 0);
    const tax = lineItems.reduce(
      (s, r) => s + r.qty * r.rate * (r.taxRate / 100),
      0
    );
    return {
      subtotal: +sub.toFixed(2),
      taxTotal: +tax.toFixed(2),
      total: +(sub + tax - discount).toFixed(2),
    };
  }, [lineItems, discount]);
}

export interface InvoiceState {
  selectedCustomer: Customer | null;
  newCustomerMode: boolean;
  newName: string;
  newMobile: string;
  lineItems: LineItem[];
  discount: number;
  paymentMode: "Cash" | "UPI" | "Card" | "Other";
  notes: string;
  customerNotes: string;
  intraState: boolean;
}

export function useInvoiceState(initialData?: Partial<InvoiceState>) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialData?.selectedCustomer ?? null
  );
  const [newCustomerMode, setNewCustomerMode] = useState(
    initialData?.newCustomerMode ?? false
  );
  const [newName, setNewName] = useState(initialData?.newName ?? "");
  const [newMobile, setNewMobile] = useState(initialData?.newMobile ?? "");

  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.lineItems && initialData.lineItems.length > 0
      ? initialData.lineItems.map(item => ({ ...item, _key: ++_keyCounter }))
      : [createLineItem()]
  );
  const [discount, setDiscount] = useState(initialData?.discount ?? 0);
  const [paymentMode, setPaymentMode] = useState<
    "Cash" | "UPI" | "Card" | "Other"
  >(initialData?.paymentMode ?? "Cash");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [customerNotes, setCustomerNotes] = useState(
    initialData?.customerNotes ?? ""
  );
  const [intraState, setIntraState] = useState(
    initialData?.intraState ?? true
  );

  return {
    state: {
      selectedCustomer,
      newCustomerMode,
      newName,
      newMobile,
      lineItems,
      discount,
      paymentMode,
      notes,
      customerNotes,
      intraState,
    },
    actions: {
      setSelectedCustomer,
      setNewCustomerMode,
      setNewName,
      setNewMobile,
      setLineItems,
      setDiscount,
      setPaymentMode,
      setNotes,
      setCustomerNotes,
      setIntraState,
      addServiceById: (serviceId: number, services: Service[]) => {
        const svc = services.find((s) => s.id === serviceId);
        if (!svc) return;
        setLineItems((rows) => {
          const existing = rows.find((r) => r.serviceId === serviceId);
          if (existing) {
            return rows.map((r) =>
              r._key === existing._key ? { ...r, qty: r.qty + 1 } : r
            );
          }
          const blank = rows.find((r) => !r.serviceId);
          const filled = createLineItem(svc);
          if (blank) return rows.map((r) => (r._key === blank._key ? filled : r));
          return [...rows, filled];
        });
      },
      updateRow: (key: number, patch: Partial<LineItem>) => {
        setLineItems((rows) =>
          rows.map((r) => (r._key === key ? { ...r, ...patch } : r))
        );
      },
      addRow: () => setLineItems((rows) => [...rows, createLineItem()]),
      removeRow: (key: number) =>
        setLineItems((rows) => rows.filter((r) => r._key !== key)),
      handleServiceSelect: (key: number, serviceId: number, services: Service[]) => {
        const svc = services.find((s) => s.id === serviceId);
        setLineItems((rows) =>
          rows.map((r) =>
            r._key === key
              ? {
                  ...r,
                  serviceId,
                  description: svc?.name ?? "",
                  rate: svc?.defaultPrice ?? 0,
                  taxRate: svc?.taxRate ?? 0,
                }
              : r
          )
        );
      },
    },
  };
}

export function buildInvoicePayload(
  state: InvoiceState,
  status: "PAID" | "PENDING"
) {
  const validItems = state.lineItems.filter((r) => r.serviceId && r.qty > 0);
  if (validItems.length === 0) {
    throw new Error("Please add at least one line item.");
  }
  if (!state.selectedCustomer && !state.newCustomerMode) {
    throw new Error("Please select or create a customer.");
  }
  if (state.newCustomerMode && !state.newName.trim()) {
    throw new Error("Please enter customer name.");
  }

  return {
    customerId: state.selectedCustomer?.id,
    newCustomer: state.newCustomerMode
      ? { name: state.newName.trim(), mobile: state.newMobile.trim() }
      : undefined,
    items: validItems.map(({ _key, ...rest }) => rest),
    discount: state.discount,
    paymentMode: state.paymentMode,
    status,
    notes: state.notes || undefined,
    customerNotes: state.customerNotes.trim() || undefined,
  };
}
