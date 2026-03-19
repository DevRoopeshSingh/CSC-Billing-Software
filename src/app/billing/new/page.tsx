"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Service, Customer, LineItemInput } from "@/types";

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

export default function NewBillPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const [lineItems, setLineItems] = useState<LineItemRow[]>([newRow()]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data: Service[]) => setServices(data.filter((s) => s.isActive)));
  }, []);

  const searchCustomers = useCallback(async (q: string) => {
    const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}`);
    setCustomers(await res.json());
  }, []);

  useEffect(() => {
    searchCustomers(customerSearch);
  }, [customerSearch, searchCustomers]);

  // Handle URL customer pre-selection
  useEffect(() => {
    const cid = searchParams.get("customerId");
    if (cid && customers.length > 0 && !selectedCustomer) {
      const match = customers.find(c => c.id.toString() === cid);
      if (match) {
        setSelectedCustomer(match);
        setCustomerSearch(match.name);
      }
    }
  }, [searchParams, customers, selectedCustomer]);

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

    if (!selectedCustomer && !newCustomerMode) {
      setError("Please select or create a customer.");
      return;
    }

    if (newCustomerMode && !newCustomerName.trim()) {
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
        newCustomer: newCustomerMode
          ? { name: newCustomerName, mobile: newCustomerMobile }
          : undefined,
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

  return (
    <div>
      <div className="page-header">
        <h2>New Bill</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* ── Customer Section ─────────────────────────────────────── */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
            Customer Details
          </h3>

          <div className="flex gap-8" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={`btn ${!newCustomerMode ? "btn-primary" : "btn-ghost"}`}
              onClick={() => { setNewCustomerMode(false); setSelectedCustomer(null); }}
            >
              Existing Customer
            </button>
            <button
              type="button"
              className={`btn ${newCustomerMode ? "btn-primary" : "btn-ghost"}`}
              onClick={() => { setNewCustomerMode(true); setSelectedCustomer(null); }}
            >
              + New Customer
            </button>
          </div>

          {!newCustomerMode ? (
            <div style={{ position: "relative", maxWidth: 400 }}>
              <input
                type="text"
                placeholder="Search customer by name or mobile…"
                value={customerSearch}
                autoFocus
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomerDropdownOpen(true);
                  setSelectedCustomer(null);
                }}
                onFocus={() => setCustomerDropdownOpen(true)}
              />
              {selectedCustomer && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 12px",
                    background: "#dcfce7",
                    border: "1px solid #bbf7d0",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  ✓ {selectedCustomer.name}{" "}
                  {selectedCustomer.mobile && `— ${selectedCustomer.mobile}`}
                </div>
              )}
              {customerDropdownOpen && !selectedCustomer && customers.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "rgba(255, 255, 255, 0.85)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: "var(--radius-md)",
                    maxHeight: 200,
                    overflowY: "auto",
                    zIndex: 100,
                    boxShadow: "var(--shadow-md)",
                    marginTop: 4,
                  }}
                  className="dropdown-menu"
                >
                  {customers.map((c) => (
                    <div
                      key={c.id}
                      style={{ padding: "9px 14px", cursor: "pointer" }}
                      onMouseDown={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch(c.name);
                        setCustomerDropdownOpen(false);
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "")}
                    >
                      <strong>{c.name}</strong>
                      {c.mobile && (
                        <span style={{ color: "#6b7280", marginLeft: 8 }}>
                          {c.mobile}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", maxWidth: 500 }}>
              <div className="form-group">
                <label htmlFor="ncName">Name *</label>
                <input
                  id="ncName"
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Customer name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="ncMobile">Mobile</label>
                <input
                  id="ncMobile"
                  type="tel"
                  value={newCustomerMobile}
                  onChange={(e) => setNewCustomerMobile(e.target.value)}
                  placeholder="9876543210"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Line Items ────────────────────────────────────────────── */}
        <div className="card" style={{ padding: "24px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 24px 16px" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
              Invoice Items
            </h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addRow}>
              + Add Item
            </button>
          </div>
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
                          className="table-input"
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
                          className="table-input"
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
                          className="table-input"
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
                          className="table-input"
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
                          className="table-input"
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
          </div>
        </div>

        {/* ── Payment & Notes ───────────────────────────────────────── */}
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

        {/* ── Totals + Submit ───────────────────────────────────────── */}
        <div className="flex items-center justify-between" style={{ marginTop: 24, paddingBottom: 64 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.back()}
            style={{ padding: "12px 24px" }}
          >
            Cancel
          </button>

          <div className="flex items-center" style={{ gap: 24 }}>
            <div className="totals-box" style={{ margin: 0, minWidth: 280 }}>
              <div className="totals-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="totals-row">
                <span>Tax</span>
                <span>₹{taxTotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="totals-row" style={{ color: "var(--danger)" }}>
                  <span>Discount</span>
                  <span>−₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="totals-row total-final" style={{ borderTopColor: "var(--border)" }}>
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ fontSize: 15, padding: "16px 32px", height: "100%" }}
            >
              {submitting ? "Saving…" : "Save Invoice"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
