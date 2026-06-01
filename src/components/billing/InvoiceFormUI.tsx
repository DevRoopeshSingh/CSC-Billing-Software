import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import BookmarkedServices from "@/components/BookmarkedServices";
import type { Service, Customer } from "@/shared/types";
import {
  UserCheck,
  UserPlus,
  Plus,
  Search,
  Check,
  FileText,
  Save,
  Printer,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { InvoiceState, LineItem } from "./useInvoiceState";
import { createLineItem } from "./useInvoiceState";
import OcrUpload from "@/components/invoices/OcrUpload";
import ServiceSuggestions from "@/components/invoices/ServiceSuggestions";
import VoiceMic from "@/components/invoices/VoiceMic";

interface InvoiceFormUIProps {
  mode: "create" | "edit";
  invoiceNo?: string;
  invoiceDate?: Date | string | null;
  state: InvoiceState;
  actions: {
    setSelectedCustomer: (c: Customer | null) => void;
    setNewCustomerMode: (v: boolean) => void;
    setNewName: (v: string) => void;
    setNewMobile: (v: string) => void;
    setDiscount: (v: number) => void;
    setAdvancePayment: (v: number) => void;
    setSendWhatsApp: (v: boolean) => void;
    setSendSms: (v: boolean) => void;
    setPointsRedeemed: (v: number) => void;
    setPaymentMode: (v: "Cash" | "UPI" | "Card" | "Other") => void;
    setNotes: (v: string) => void;
    setCustomerNotes: (v: string) => void;
    setIntraState: (v: boolean) => void;
    addServiceById: (id: number, services: Service[]) => void;
    updateRow: (key: number, patch: Partial<LineItem>) => void;
    addRow: () => void;
    removeRow: (key: number) => void;
    handleServiceSelect: (key: number, serviceId: number, services: Service[]) => void;
    setLineItems: React.Dispatch<React.SetStateAction<LineItem[]>>;
  };
  totals: { subtotal: number; taxTotal: number; total: number; govTotal?: number };
  services: Service[];
  customers: Customer[];
  customerSearch: string;
  setCustomerSearch: (q: string) => void;
  onSubmit: (status: "PAID" | "PENDING") => void;
  onPreview?: () => void;
  actionLoading: "save" | "draft" | null;
}

export function InvoiceFormUI({
  mode,
  invoiceNo,
  invoiceDate,
  state,
  actions,
  totals,
  services,
  customers,
  customerSearch,
  setCustomerSearch,
  onSubmit,
  onPreview,
  actionLoading,
}: InvoiceFormUIProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);

  const filteredServices = useMemo(() => {
    if (!serviceSearchTerm) return [];
    const q = serviceSearchTerm.toLowerCase();
    return services
      .filter((s) => s.name.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q))
      .slice(0, 10);
  }, [services, serviceSearchTerm]);

  const grouped = useMemo(
    () =>
      services.reduce(
        (acc, s) => {
          const cat = s.category || "Other";
          (acc[cat] ??= []).push(s);
          return acc;
        },
        {} as Record<string, Service[]>
      ),
    [services]
  );

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
      {mode === "edit" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 text-amber-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Editing PENDING Invoice <strong>{invoiceNo}</strong>. Invoice
              number and date cannot be changed.
            </p>
          </div>
          {invoiceDate && (
            <p className="text-xs font-medium text-amber-900/80">
              Invoice date:{" "}
              <span className="font-semibold">{formatDate(invoiceDate)}</span>
            </p>
          )}
        </div>
      )}

      <BookmarkedServices onSelect={(id) => actions.addServiceById(id, services)} />

      <div className="flex flex-col gap-4 mb-4">
        <OcrUpload
          onDataExtracted={(data) => {
            if (data.vendorName) {
              actions.setNewCustomerMode(true);
              actions.setNewName(data.vendorName);
            }
            if (data.items && data.items.length > 0) {
              actions.setLineItems((prev) => {
                const newItems = data.items.map((i: any) => ({
                  ...createLineItem(),
                  description: i.description || "",
                  qty: i.qty || 1,
                  rate: i.rate || 0,
                }));
                // Only keep non-empty previous items or just append
                const validPrev = prev.filter(p => p.description || p.rate || p.serviceId);
                return [...validPrev, ...newItems];
              });
            }
          }}
        />
        <div className="flex items-center gap-4">
          <VoiceMic
            onDraftCreated={(data) => {
              if (data.customerName) {
                actions.setNewCustomerMode(true);
                actions.setNewName(data.customerName);
              }
              if (data.services && data.services.length > 0) {
                actions.setLineItems((prev) => {
                  const newItems = data.services.map((s: any) => ({
                    ...createLineItem(),
                    description: s.name || "",
                    qty: s.qty || 1,
                  }));
                  const validPrev = prev.filter(p => p.description || p.rate || p.serviceId);
                  return [...validPrev, ...newItems];
                });
              }
            }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground">
          Customer Details
        </h3>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              actions.setNewCustomerMode(false);
              actions.setSelectedCustomer(null);
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors",
              !state.newCustomerMode
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
              actions.setNewCustomerMode(true);
              actions.setSelectedCustomer(null);
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors",
              state.newCustomerMode
                ? "bg-primary text-white"
                : "border border-border bg-card text-foreground hover:bg-background"
            )}
          >
            <UserPlus className="h-4 w-4" />
            New Customer
          </button>
        </div>

        {!state.newCustomerMode ? (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-[14px] h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customer by name or mobile..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setDropdownOpen(true);
                actions.setSelectedCustomer(null);
              }}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 120)}
              className={cn(inputCls, "pl-10")}
            />

            {state.selectedCustomer && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                <Check className="h-4 w-4" />
                {state.selectedCustomer.name}
                {state.selectedCustomer.mobile && ` — ${state.selectedCustomer.mobile}`}
              </div>
            )}
            
            {state.selectedCustomer && (
              <div className="mt-3">
                <ServiceSuggestions
                  customerId={state.selectedCustomer.id?.toString() || ""}
                  pastServices={state.lineItems.map(item => item.description).filter(Boolean)}
                  onSelectService={(serviceName) => {
                    const matched = services.find(s => s.name === serviceName);
                    if (matched && matched.id) {
                      actions.addServiceById(matched.id, services);
                    } else {
                      actions.setLineItems((prev) => {
                        const validPrev = prev.filter(p => p.description || p.rate || p.serviceId);
                        return [...validPrev, { ...createLineItem(), description: serviceName }];
                      });
                    }
                  }}
                />
              </div>
            )}

            {dropdownOpen && !state.selectedCustomer && (
              <div
                className={cn(
                  "absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto",
                  "rounded-lg border border-border bg-card shadow-lg"
                )}
              >
                {customers.length === 0 ? (
                  <button
                    type="button"
                    onMouseDown={() => {
                      actions.setNewCustomerMode(true);
                      actions.setNewName(customerSearch);
                      setDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-background"
                  >
                    <UserPlus className="h-4 w-4 text-primary" />
                    <span>
                      Add new customer
                      {customerSearch && (
                        <strong className="ml-1 text-primary">
                          &ldquo;{customerSearch}&rdquo;
                        </strong>
                      )}
                    </span>
                  </button>
                ) : (
                  customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-background"
                      onMouseDown={() => {
                        actions.setSelectedCustomer(c);
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
                          <p className="text-xs text-muted-foreground">
                            {c.mobile}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
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
                value={state.newName}
                onChange={(e) => actions.setNewName(e.target.value)}
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
                value={state.newMobile}
                onChange={(e) => actions.setNewMobile(e.target.value)}
                placeholder="9876543210"
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
            Invoice Items
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={state.intraState}
                onChange={(e) => actions.setIntraState(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border"
              />
              Intra-state (CGST+SGST)
            </label>
            
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Quick search & add..."
                  value={serviceSearchTerm}
                  onChange={(e) => {
                    setServiceSearchTerm(e.target.value);
                    setServiceSearchOpen(true);
                  }}
                  onFocus={() => setServiceSearchOpen(true)}
                  onBlur={() => setTimeout(() => setServiceSearchOpen(false), 150)}
                  className={cn(
                    "w-48 rounded-lg border border-border bg-card py-1.5 pl-8 pr-3 text-xs",
                    "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  )}
                />
                {serviceSearchOpen && serviceSearchTerm && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-64 max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                    {filteredServices.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">No matches found</div>
                    ) : (
                      filteredServices.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => {
                            actions.addServiceById(s.id!, services);
                            setServiceSearchTerm("");
                            setServiceSearchOpen(false);
                          }}
                          className="flex w-full flex-col px-3 py-2 text-left hover:bg-background transition-colors border-b border-border/50 last:border-0"
                        >
                          <span className="text-xs font-semibold text-foreground">{s.name}</span>
                          <span className="text-[10px] text-muted-foreground">₹{(s.defaultPrice || 0).toFixed(2)} &bull; {s.category || 'Other'}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={actions.addRow}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5",
                  "text-xs font-medium text-foreground transition-colors hover:bg-background"
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Empty Row
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ minWidth: 180 }}
                >
                  Service
                </th>
                <th
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ minWidth: 180 }}
                >
                  Description
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ width: 70 }}
                >
                  Qty
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ width: 100 }}
                >
                  Rate
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ width: 100 }}
                >
                  Govt. Charge
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ width: 100 }}
                >
                  {state.intraState ? "CGST+SGST %" : "IGST %"}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ width: 110 }}
                >
                  Total
                </th>
                <th className="px-4 py-3" style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {state.lineItems.map((row) => {
                const lineBase = row.qty * row.rate;
                const govBase = row.qty * (row.govCharge || 0);
                const lineTax = lineBase * (row.taxRate / 100);
                const lineTotal = lineBase + govBase + lineTax;

                return (
                  <tr
                    key={row._key}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-4 py-2">
                      <select
                        value={row.serviceId || ""}
                        onChange={(e) =>
                          actions.handleServiceSelect(row._key, Number(e.target.value), services)
                        }
                        className={cn(
                          tableInputCls,
                          "rounded-lg border border-border bg-card px-2 py-1.5"
                        )}
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
                        onChange={(e) =>
                          actions.updateRow(row._key, { description: e.target.value })
                        }
                        placeholder="Description"
                        className={cn(
                          tableInputCls,
                          "rounded-lg border border-transparent px-2 py-1.5 focus:border-border focus:bg-card"
                        )}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        min="1"
                        value={row.qty}
                        onChange={(e) =>
                          actions.updateRow(row._key, { qty: Number(e.target.value) })
                        }
                        className={cn(
                          tableInputCls,
                          "rounded-lg border border-transparent px-2 py-1.5 text-center focus:border-border focus:bg-card"
                        )}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.rate}
                        onChange={(e) =>
                          actions.updateRow(row._key, { rate: Number(e.target.value) })
                        }
                        className={cn(
                          tableInputCls,
                          "rounded-lg border border-transparent px-2 py-1.5 text-right focus:border-border focus:bg-card"
                        )}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.govCharge || 0}
                        onChange={(e) =>
                          actions.updateRow(row._key, { govCharge: Number(e.target.value) })
                        }
                        className={cn(
                          tableInputCls,
                          "rounded-lg border border-transparent px-2 py-1.5 text-right focus:border-border focus:bg-card"
                        )}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={row.taxRate}
                        onChange={(e) =>
                          actions.updateRow(row._key, {
                            taxRate: Number(e.target.value),
                          })
                        }
                        className={cn(
                          tableInputCls,
                          "rounded-lg border border-transparent px-2 py-1.5 text-center focus:border-border focus:bg-card"
                        )}
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-foreground">
                      ₹{lineTotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {state.lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => actions.removeRow(row._key)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground">
              Internal Notes
            </h3>
            <textarea
              value={state.notes}
              onChange={(e) => actions.setNotes(e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="Private notes (not printed on invoice)..."
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground">
              Customer Notes
            </h3>
            <textarea
              value={state.customerNotes}
              onChange={(e) => actions.setCustomerNotes(e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="Terms, conditions, or notes visible on PDF..."
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground">
            Payment & Totals
          </h3>

          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold text-foreground">
              Payment Mode
            </label>
            <div className="flex gap-2">
              {["Cash", "UPI", "Card", "Other"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => actions.setPaymentMode(mode as any)}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                    state.paymentMode === mode
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-background"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg bg-background p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">
                {formatCurrency(totals.subtotal)}
              </span>
            </div>
            {totals.govTotal !== undefined && totals.govTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Govt. Charges</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(totals.govTotal)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium text-foreground">
                {formatCurrency(totals.taxTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Discount (₹)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={state.discount}
                onChange={(e) => actions.setDiscount(Number(e.target.value))}
                className="w-24 rounded-md border border-border bg-card px-2 py-1 text-right text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Advance Payment (₹)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={state.advancePayment}
                onChange={(e) => actions.setAdvancePayment(Number(e.target.value))}
                className="w-24 rounded-md border border-border bg-card px-2 py-1 text-right text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
            {state.advancePayment > 0 && state.advancePayment < totals.total && (
              <p className="text-[11px] text-muted-foreground text-right mb-2">
                This will leave a balance due. Be sure to save as PENDING.
              </p>
            )}
            {state.selectedCustomer && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex flex-col">
                  <span>Redeem Points</span>
                  <span className="text-[10px]">Max: {state.selectedCustomer.loyaltyPoints ?? 0}</span>
                </span>
                <input
                  type="number"
                  min="0"
                  max={state.selectedCustomer.loyaltyPoints ?? 0}
                  step="1"
                  value={state.pointsRedeemed ?? 0}
                  onChange={(e) => {
                    const val = Math.min(Number(e.target.value), state.selectedCustomer?.loyaltyPoints ?? 0);
                    actions.setPointsRedeemed(val);
                    // Also increase discount by redeemed points? Yes.
                    // Assuming 1 point = 1 INR
                  }}
                  className="w-24 rounded-md border border-border bg-card px-2 py-1 text-right text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            )}
            <div className="my-2 border-t border-border" />
            <div className="flex justify-between text-lg font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-primary">
                {formatCurrency(totals.total)}
              </span>
            </div>
            {state.advancePayment > 0 && (
              <div className="flex justify-between text-sm font-semibold mt-1">
                <span className="text-muted-foreground">Balance Due</span>
                <span className="text-rose-600">
                  {formatCurrency(Math.max(0, totals.total - state.advancePayment))}
                </span>
              </div>
            )}
            
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 border border-emerald-100 dark:border-emerald-900/50">
                <input
                  type="checkbox"
                  id="sendWhatsApp"
                  checked={state.sendWhatsApp}
                  onChange={(e) => actions.setSendWhatsApp(e.target.checked)}
                  className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="sendWhatsApp" className="text-sm font-medium text-emerald-700 dark:text-emerald-500">
                  Send WhatsApp Receipt
                </label>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-2 border border-blue-100 dark:border-blue-900/50">
                <input
                  type="checkbox"
                  id="sendSms"
                  checked={state.sendSms}
                  onChange={(e) => actions.setSendSms(e.target.checked)}
                  className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sendSms" className="text-sm font-medium text-blue-700 dark:text-blue-500">
                  Send SMS Notification
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={() => {
                const status = (state.advancePayment > 0 && state.advancePayment < totals.total) ? "PENDING" : "PAID";
                onSubmit(status);
              }}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5",
                "text-[15px] font-semibold text-white shadow-sm transition-all",
                "hover:bg-primary-dark hover:shadow disabled:opacity-50"
              )}
            >
              {actionLoading === "save" ? (
                "Saving..."
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  {mode === "edit" ? "Save Changes" : (state.advancePayment > 0 && state.advancePayment < totals.total ? "Save as PENDING (Partial)" : "Save as PAID")}
                </>
              )}
            </button>
            <div className={cn("grid gap-3", onPreview ? "grid-cols-2" : "grid-cols-1")}>
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={() => onSubmit("PENDING")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3",
                  "text-[15px] font-semibold text-foreground transition-colors",
                  "hover:bg-background disabled:opacity-50"
                )}
              >
                {actionLoading === "draft" ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save as Draft
                  </>
                )}
              </button>
              {onPreview && (
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={onPreview}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3",
                    "text-[15px] font-semibold text-foreground transition-colors",
                    "hover:bg-background disabled:opacity-50"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Preview
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
