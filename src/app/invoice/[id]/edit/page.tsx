"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Service, Customer, InvoiceDetail, LineItemInput } from "@/types";

interface LineItemRow extends LineItemInput {
  _key: number;
}

let _key = 0;
const newRow = (): LineItemRow => ({
  _key: ++_key,
  serviceId: 0,
  description: "",
  qty: 1,
  rate: 0,
  taxRate: 0,
});

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const invoiceId = Number(unwrappedParams.id);

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/services").then((r) => r.json()),
      fetch(`/api/invoices/${invoiceId}`).then((r) => r.json()),
    ]).then(([svcs, inv]: [Service[], InvoiceDetail]) => {
      setServices(svcs.filter((s) => s.isActive));
      
      setSelectedCustomer(inv.customer);
      setCustomerSearch(inv.customer.name);
      setDiscount(inv.discount);
      setPaymentMode(inv.paymentMode);
      setNotes(inv.notes || "");
      
      const mappedItems = inv.items.map(item => ({
        _key: ++_key,
        serviceId: item.serviceId,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        taxRate: item.taxRate,
      }));
      setLineItems(mappedItems.length > 0 ? mappedItems : [newRow()]);
      
      setLoading(false);
    }).catch(err => {
      setError("Failed to load invoice data.");
      setLoading(false);
    });
  }, [invoiceId]);

  const searchCustomers = useCallback(async (q: string) => {
    if (!q) return;
    const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}`);
    setCustomers(await res.json());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerSearch), 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  // ── Line item helpers ───────────────────────────────────────────────────────
  const updateRow = (key: number, patch: Partial<LineItemRow>) => {
    setLineItems((rows) =>
      rows.map((r) => (r._key === key ? { ...r, ...patch } : r))
    );
  };

  const handleServiceChange = (key: number, serviceId: number) => {
    const svc = services.find((s) => s.id === serviceId);
    updateRow(key, {
      serviceId,
      description: svc?.name ?? "",
      rate: svc?.defaultPrice ?? 0,
      taxRate: svc?.taxRate ?? 0,
    });
  };

  const addRow = () => setLineItems((rows) => [...rows, newRow()]);
  const removeRow = (key: number) =>
    setLineItems((rows) => rows.filter((r) => r._key !== key));

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal = lineItems.reduce((s, r) => s + r.qty * r.rate, 0);
  const taxTotal = lineItems.reduce(
    (s, r) => s + r.qty * r.rate * (r.taxRate / 100),
    0
  );
  const total = subtotal + taxTotal - discount;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validItems = lineItems.filter((r) => r.serviceId && r.qty > 0);
    if (validItems.length === 0) {
      setError("Please add at least one line item.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        items: validItems.map(({ _key, ...rest }) => rest),
        discount,
        paymentMode,
        notes: notes || undefined,
      };

      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push(`/invoice/${invoiceId}`);
      } else {
        const err = await res.json();
        setError(err.error ?? "Failed to update invoice.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-center mt-24 text-muted">Loading invoice...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Edit Invoice</h2>
        <button className="btn btn-ghost" onClick={() => router.push(`/invoice/${invoiceId}`)}>
          Cancel
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Customer Section (Read-Only) */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Customer (Cannot be changed on edit)
          </h3>
          <p className="text-muted">
            <strong>{selectedCustomer?.name}</strong> {selectedCustomer?.mobile ? `(${selectedCustomer.mobile})` : ""}
          </p>
        </div>

        {/* Line Items */}
        <div className="card" style={{ padding: "20px 0 0" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 24px 16px" }}>
            Services / Line Items
          </h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Service</th>
                  <th style={{ minWidth: 200 }}>Description</th>
                  <th style={{ width: 70 }}>Qty</th>
                  <th style={{ width: 100 }}>Rate (₹)</th>
                  <th style={{ width: 80 }}>Tax %</th>
                  <th className="text-right" style={{ width: 110 }}>Line Total</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((row) => {
                  const lineBase = row.qty * row.rate;
                  const lineTax = lineBase * (row.taxRate / 100);
                  const lineTotal = lineBase + lineTax;

                  return (
                    <tr key={row._key}>
                      <td>
                        <select
                          value={row.serviceId || ""}
                          onChange={(e) =>
                            handleServiceChange(row._key, Number(e.target.value))
                          }
                        >
                          <option value="">— Select —</option>
                          {Object.entries(
                            services.reduce((acc, s) => {
                              const cat = s.category || "Other";
                              if (!acc[cat]) acc[cat] = [];
                              acc[cat].push(s);
                              return acc;
                            }, {} as Record<string, Service[]>)
                          ).map(([category, svcs]) => (
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
                      <td>
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            updateRow(row._key, { description: e.target.value })
                          }
                          placeholder="Description"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={row.qty}
                          onChange={(e) =>
                            updateRow(row._key, { qty: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.rate}
                          onChange={(e) =>
                            updateRow(row._key, { rate: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td>
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
                        />
                      </td>
                      <td className="text-right" style={{ fontWeight: 600 }}>
                        ₹{lineTotal.toFixed(2)}
                      </td>
                      <td>
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => removeRow(row._key)}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "12px 24px 20px" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={addRow}
            >
              + Add Row
            </button>
          </div>
        </div>

        {/* Payment & Notes */}
        <div className="card">
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div className="form-group">
              <label htmlFor="discount">Discount (₹)</label>
              <input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="paymentMode">Payment Mode</label>
              <select
                id="paymentMode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes (optional)</label>
              <input
                id="notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any remarks…"
              />
            </div>
          </div>
        </div>

        {/* Totals + Submit */}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="btn btn-success"
            disabled={submitting}
            style={{ fontSize: 15, padding: "12px 28px" }}
          >
            {submitting ? "Saving…" : "✓ Save Changes"}
          </button>

          <div className="totals-box">
            <div className="totals-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="totals-row">
              <span>Tax</span>
              <span>₹{taxTotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="totals-row" style={{ color: "#dc2626" }}>
                <span>Discount</span>
                <span>−₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="totals-row total-final">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
