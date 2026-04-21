// src/app/billing/new/page.tsx
"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { ipc, IpcError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import BookmarkedServices from "@/components/BookmarkedServices";
import type { Service, Customer, CenterProfile } from "@/shared/types";
import {
  UserCheck,
  UserPlus,
  Plus,
  Trash2,
  Receipt,
  ArrowLeft,
  Search,
  Check,
  FileText,
  Save,
  Printer,
} from "lucide-react";

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

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [lineItems, setLineItems] = useState<LineItem[]>([newLineItem()]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<
    "Cash" | "UPI" | "Card" | "Other"
  >("Cash");
  const [notes, setNotes] = useState("");
  const [intraState, setIntraState] = useState(true);
  const [action, setAction] = useState<"save" | "draft" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [svcs, center] = await Promise.all([
          ipc<Service[]>(IPC.SERVICES_LIST),
          ipc<CenterProfile>(IPC.CENTER_GET),
        ]);
        setServices((svcs ?? []).filter((s) => s.isActive));
        if (center?.defaultPaymentMode) {
          setPaymentMode(
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
  }, [toast]);

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
    if (cid && customers.length > 0 && !selectedCustomer) {
      const match = customers.find((c) => String(c.id) === cid);
      if (match) {
        setSelectedCustomer(match);
        setCustomerSearch(match.name);
      }
    }
  }, [searchParams, customers, selectedCustomer]);

  useEffect(() => {
    const sid = searchParams.get("serviceId");
    if (sid && services.length > 0) {
      addServiceById(Number(sid));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, services]);

  const addServiceById = (serviceId: number) => {
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
      const filled: LineItem = {
        _key: blank?._key ?? ++_keyCounter,
        serviceId,
        description: svc.name,
        qty: 1,
        rate: svc.defaultPrice,
        taxRate: svc.taxRate,
      };
      if (blank) return rows.map((r) => (r._key === blank._key ? filled : r));
      return [...rows, filled];
    });
  };

  const updateRow = (key: number, patch: Partial<LineItem>) =>
    setLineItems((rows) =>
      rows.map((r) => (r._key === key ? { ...r, ...patch } : r))
    );

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

  const { subtotal, taxTotal, total } = useMemo(() => {
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

  const submit = async (status: "PAID" | "PENDING") => {
    if (!selectedCustomer && !newCustomerMode) {
      toast("Please select or create a customer.", "error");
      return;
    }
    if (newCustomerMode && !newName.trim()) {
      toast("Please enter customer name.", "error");
      return;
    }
    const validItems = lineItems.filter((r) => r.serviceId && r.qty > 0);
    if (validItems.length === 0) {
      toast("Please add at least one line item.", "error");
      return;
    }

    setAction(status === "PAID" ? "save" : "draft");
    try {
      const payload = {
        customerId: selectedCustomer?.id,
        newCustomer: newCustomerMode
          ? { name: newName.trim(), mobile: newMobile.trim() }
          : undefined,
        items: validItems.map(({ _key, ...rest }) => rest),
        discount,
        paymentMode,
        status,
        notes: notes || undefined,
      };
      const result = await ipc<{
        id: number;
        invoiceNo: string;
      }>(IPC.INVOICES_CREATE, payload);
      toast(`Invoice ${result.invoiceNo} created`, "success");
      router.push(`/invoices/${result.id}`);
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to create invoice",
        "error"
      );
    } finally {
      setAction(null);
    }
  };

  const handlePreview = () => {
    toast("PDF preview is not implemented yet", "info");
  };

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

      <BookmarkedServices onSelect={addServiceById} />

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
            <Search className="absolute left-3 top-[14px] h-4 w-4 text-muted-foreground" />
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
              onBlur={() => setTimeout(() => setDropdownOpen(false), 120)}
              className={cn(inputCls, "pl-10")}
            />

            {selectedCustomer && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                <Check className="h-4 w-4" />
                {selectedCustomer.name}
                {selectedCustomer.mobile && ` — ${selectedCustomer.mobile}`}
              </div>
            )}

            {dropdownOpen && !selectedCustomer && (
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
                      setNewCustomerMode(true);
                      setNewName(customerSearch);
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

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
            Invoice Items
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={intraState}
                onChange={(e) => setIntraState(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border"
              />
              Intra-state (CGST+SGST)
            </label>
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
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ width: 100 }}
                >
                  {intraState ? "CGST+SGST %" : "IGST %"}
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
                          updateRow(row._key, { description: e.target.value })
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
                          updateRow(row._key, { qty: Number(e.target.value) })
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
                          updateRow(row._key, { rate: Number(e.target.value) })
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
                          updateRow(row._key, {
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
              onChange={(e) =>
                setPaymentMode(
                  e.target.value as "Cash" | "UPI" | "Card" | "Other"
                )
              }
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
          <div className="w-72 rounded-xl border border-primary/20 bg-primary-light p-5">
            <div className="flex justify-between py-1 text-sm text-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {intraState ? (
              <>
                <div className="flex justify-between py-1 text-sm text-foreground">
                  <span>CGST</span>
                  <span>{formatCurrency(taxTotal / 2)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm text-foreground">
                  <span>SGST</span>
                  <span>{formatCurrency(taxTotal / 2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-1 text-sm text-foreground">
                <span>IGST</span>
                <span>{formatCurrency(taxTotal)}</span>
              </div>
            )}
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

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handlePreview}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border px-5 py-2.5",
                "text-sm font-medium text-foreground transition-colors hover:bg-background"
              )}
            >
              <FileText className="h-4 w-4" />
              Preview PDF
            </button>
            <button
              type="button"
              onClick={() => submit("PENDING")}
              disabled={action !== null}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border px-5 py-2.5",
                "text-sm font-medium text-foreground transition-colors hover:bg-background",
                "disabled:opacity-50"
              )}
            >
              <Save className="h-4 w-4" />
              {action === "draft" ? "Saving..." : "Save as Draft"}
            </button>
            <button
              type="button"
              onClick={() => submit("PAID")}
              disabled={action !== null}
              className={cn(
                "flex items-center gap-2 rounded-xl bg-primary px-6 py-3",
                "text-base font-bold text-white shadow-md transition-all",
                "hover:bg-primary-dark hover:shadow-lg",
                "disabled:opacity-50"
              )}
            >
              {action === "save" ? (
                <>
                  <Receipt className="h-5 w-5" />
                  Saving...
                </>
              ) : (
                <>
                  <Printer className="h-5 w-5" />
                  Issue Invoice
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewBillPage() {
  return (
    <Suspense>
      <NewInvoiceForm />
    </Suspense>
  );
}
