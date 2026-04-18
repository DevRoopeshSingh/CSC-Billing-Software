// src/renderer/app/billing/new/page.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { SERVICE_CATEGORIES } from "@/config/categories";
import {
  UserCheck,
  UserPlus,
  Plus,
  Trash2,
  Receipt,
  ArrowLeft,
  Search,
  Check,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface Service {
  id: number;
  name: string;
  category: string;
  defaultPrice: number;
  taxRate: number;
  isActive: boolean;
}

interface Customer {
  id: number;
  name: string;
  mobile: string;
}

interface LineItem {
  _key: number;
  serviceId: number;
  description: string;
  qty: number;
  rate: number;
  taxRate: number;
}

let _keyCounter = 0;
const newLineItem = (): LineItem => ({
  _key: ++_keyCounter,
  serviceId: 0,
  description: "",
  qty: 1,
  rate: 0,
  taxRate: 0,
});

// ── Main Form ────────────────────────────────────────────────────────────────
function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [lineItems, setLineItems] = useState<LineItem[]>([newLineItem()]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    Promise.all([
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/center").then((r) => r.json()),
    ]).then(([svcs, center]) => {
      setServices((svcs as Service[]).filter((s) => s.isActive));
      if (center?.defaultPaymentMode) setPaymentMode(center.defaultPaymentMode);
    });
  }, []);

  // Customer search
  const searchCustomers = useCallback(async (q: string) => {
    const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}`);
    if (res.ok) setCustomers(await res.json());
  }, []);

  useEffect(() => {
    searchCustomers(customerSearch);
  }, [customerSearch, searchCustomers]);

  // Pre-select from URL
  useEffect(() => {
    const cid = searchParams.get("customerId");
    if (cid && customers.length > 0 && !selectedCustomer) {
      const match = customers.find((c) => c.id.toString() === cid);
      if (match) {
        setSelectedCustomer(match);
        setCustomerSearch(match.name);
      }
    }
  }, [searchParams, customers, selectedCustomer]);

  // ── Line item helpers ──────────────────────────────────────────────────────
  const updateRow = (key: number, patch: Partial<LineItem>) =>
    setLineItems((rows) => rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));

  const handleServiceSelect = (key: number, serviceId: number) => {
    const svc = services.find((s) => s.id === serviceId);
    updateRow(key, {
      serviceId,
      description: svc?.name ?? "",
      rate: svc?.defaultPrice ?? 0,
      taxRate: svc?.taxRate ?? 0,
    });
  };

  const addRow = () => setLineItems((rows) => [...rows, newLineItem()]);
  const removeRow = (key: number) =>
    setLineItems((rows) => rows.filter((r) => r._key !== key));

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal = lineItems.reduce((s, r) => s + r.qty * r.rate, 0);
  const taxTotal = lineItems.reduce((s, r) => s + r.qty * r.rate * (r.taxRate / 100), 0);
  const total = subtotal + taxTotal - discount;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCustomer && !newCustomerMode) {
      setError("Please select or create a customer.");
      return;
    }
    if (newCustomerMode && !newName.trim()) {
      setError("Please enter customer name.");
      return;
    }
    const validItems = lineItems.filter((r) => r.serviceId && r.qty > 0);
    if (validItems.length === 0) {
      setError("Please add at least one line item.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        customerId: selectedCustomer?.id,
        newCustomer: newCustomerMode ? { name: newName, mobile: newMobile } : undefined,
        items: validItems.map(({ _key, ...rest }) => rest),
        discount,
        paymentMode,
        notes: notes || undefined,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const inv = await res.json();
        router.push(`/invoice/${inv.id}`);
      } else {
        const err = await res.json();
        setError(err.error ?? "Failed to create invoice.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Group services by category ─────────────────────────────────────────────
  const grouped = services.reduce(
    (acc, s) => {
      const cat = s.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    },
    {} as Record<string, Service[]>
  );

  // ── Shared input class ─────────────────────────────────────────────────────
  const inputCls = cn(
    "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground",
    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
  );

  const tableInputCls = cn(
    "w-full border-0 bg-transparent px-2 py-1.5 text-sm text-foreground",
    "focus:outline-none focus:ring-0"
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-background"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">New Invoice</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create a new bill for a customer
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Customer Section ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground">
            Customer Details
          </h3>

          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setNewCustomerMode(false);
                setSelectedCustomer(null);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors",
                !newCustomerMode
                  ? "bg-primary text-white"
                  : "border border-border bg-card text-foreground hover:bg-background"
              )}
            >
              <UserCheck className="h-4 w-4" />
              Existing Customer
            </button>
            <button
              type="button"
              onClick={() => {
                setNewCustomerMode(true);
                setSelectedCustomer(null);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors",
                newCustomerMode
                  ? "bg-primary text-white"
                  : "border border-border bg-card text-foreground hover:bg-background"
              )}
            >
              <UserPlus className="h-4 w-4" />
              New Customer
            </button>
          </div>

          {!newCustomerMode ? (
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search customer by name or mobile..."
                value={customerSearch}
                autoFocus
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setDropdownOpen(true);
                  setSelectedCustomer(null);
                }}
                onFocus={() => setDropdownOpen(true)}
                className={cn(inputCls, "pl-10")}
              />

              {selectedCustomer && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                  <Check className="h-4 w-4" />
                  {selectedCustomer.name}
                  {selectedCustomer.mobile && ` — ${selectedCustomer.mobile}`}
                </div>
              )}

              {dropdownOpen && !selectedCustomer && customers.length > 0 && (
                <div
                  className={cn(
                    "absolute left-0 right-0 top-full z-50 mt-1.5 max-h-48 overflow-y-auto",
                    "rounded-lg border border-border bg-card shadow-lg"
                  )}
                >
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-background"
                      onMouseDown={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch(c.name);
                        setDropdownOpen(false);
                      }}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{c.name}</p>
                        {c.mobile && (
                          <p className="text-xs text-muted-foreground">{c.mobile}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid max-w-lg grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Customer name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Mobile
                </label>
                <input
                  type="tel"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  placeholder="9876543210"
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Line Items ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Invoice Items
            </h3>
            <button
              type="button"
              onClick={addRow}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5",
                "text-xs font-medium text-foreground transition-colors hover:bg-background"
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ minWidth: 180 }}>
                    Service
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ minWidth: 180 }}>
                    Description
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: 70 }}>
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: 100 }}>
                    Rate
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: 70 }}>
                    Tax %
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: 110 }}>
                    Total
                  </th>
                  <th className="px-4 py-3" style={{ width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {lineItems.map((row) => {
                  const lineBase = row.qty * row.rate;
                  const lineTax = lineBase * (row.taxRate / 100);
                  const lineTotal = lineBase + lineTax;

                  return (
                    <tr
                      key={row._key}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="px-4 py-2">
                        <select
                          value={row.serviceId || ""}
                          onChange={(e) =>
                            handleServiceSelect(row._key, Number(e.target.value))
                          }
                          className={cn(tableInputCls, "rounded-lg border border-border bg-card px-2 py-1.5")}
                        >
                          <option value="">-- Select --</option>
                          {Object.entries(grouped).map(([category, svcs]) => (
                            <optgroup key={category} label={category}>
                              {svcs.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => updateRow(row._key, { description: e.target.value })}
                          placeholder="Description"
                          className={cn(tableInputCls, "rounded-lg border border-transparent px-2 py-1.5 focus:border-border focus:bg-card")}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={row.qty}
                          onChange={(e) => updateRow(row._key, { qty: Number(e.target.value) })}
                          className={cn(tableInputCls, "rounded-lg border border-transparent px-2 py-1.5 text-center focus:border-border focus:bg-card")}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.rate}
                          onChange={(e) => updateRow(row._key, { rate: Number(e.target.value) })}
                          className={cn(tableInputCls, "rounded-lg border border-transparent px-2 py-1.5 text-right focus:border-border focus:bg-card")}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={row.taxRate}
                          onChange={(e) => updateRow(row._key, { taxRate: Number(e.target.value) })}
                          className={cn(tableInputCls, "rounded-lg border border-transparent px-2 py-1.5 text-center focus:border-border focus:bg-card")}
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-foreground">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="px-4 py-2">
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(row._key)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Payment & Notes ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground">
            Payment Details
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">
                Discount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className={inputCls}
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any remarks..."
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ── Totals & Submit ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border px-5 py-3",
              "text-sm font-medium text-foreground transition-colors hover:bg-background"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </button>

          <div className="flex items-start gap-6">
            {/* Totals Box */}
            <div className="w-72 rounded-xl border border-primary/20 bg-primary-light p-5">
              <div className="flex justify-between py-1 text-sm text-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between py-1 text-sm text-foreground">
                <span>Tax (GST)</span>
                <span>{formatCurrency(taxTotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between py-1 text-sm text-danger">
                  <span>Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t-2 border-primary pt-3 text-lg font-bold text-primary">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "flex items-center gap-2 rounded-xl bg-primary px-8 py-4",
                "text-base font-bold text-white shadow-md transition-all",
                "hover:bg-primary-dark hover:shadow-lg",
                "disabled:opacity-50"
              )}
            >
              <Receipt className="h-5 w-5" />
              {submitting ? "Saving..." : "Save Invoice"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Page Wrapper (Suspense for useSearchParams) ──────────────────────────────
export default function NewBillPage() {
  return (
    <Suspense>
      <NewInvoiceForm />
    </Suspense>
  );
}
