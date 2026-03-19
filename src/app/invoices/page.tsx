"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatters";

type InvoiceSummary = {
  id: number;
  createdAt: string;
  total: number;
  status: string;
  customer: { name: string; mobile: string };
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.append("search", search);
      if (status !== "ALL") q.append("status", status);
      if (start) q.append("start", start);
      if (end) q.append("end", end);

      const res = await fetch("/api/invoices?" + q.toString());
      if (res.ok) setInvoices(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInvoices();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, status, start, end]);

  const updateStatus = async (id: number, newStatus: string) => {
    const res = await fetch(`/api/invoices/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      loadInvoices();
    }
  };

  const downloadCsv = () => {
    const q = new URLSearchParams();
    if (start) q.append("start", start);
    if (end) q.append("end", end);
    window.open("/api/export/csv?" + q.toString(), "_blank");
  };

  return (
    <div>
      <div className="page-header">
        <h2>Invoices</h2>
        <div className="flex gap-12">
          <button className="btn btn-ghost" onClick={downloadCsv}>
            ⬇ Export CSV
          </button>
          <Link href="/billing/new" className="btn btn-primary">
            + New Bill
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: "16px 20px" }}>
        <div className="form-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
          <div className="form-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search ID, customer, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="form-group">
            <label>From Date</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="form-group">
            <label>To Date</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p className="text-muted text-center" style={{ padding: 40 }}>Loading...</p>
        ) : invoices.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: 40 }}>No invoices found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600, color: "#4b5563" }}>
                      INV-{String(inv.id).padStart(4, "0")}
                    </td>
                    <td>{formatDate(inv.createdAt)}</td>
                    <td>
                      <div>{inv.customer.name}</div>
                      {inv.customer.mobile && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{inv.customer.mobile}</div>
                      )}
                    </td>
                    <td>
                      <select
                        style={{ padding: "4px 8px", fontSize: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
                        value={inv.status}
                        onChange={(e) => updateStatus(inv.id, e.target.value)}
                      >
                        <option value="PAID">PAID</option>
                        <option value="PENDING">PENDING</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="text-center">
                      <a href={`/invoice/${inv.id}?print=true`} target="_blank" className="btn btn-ghost btn-sm" style={{ marginRight: 8, padding: "5px 8px" }} title="Print Directly">
                        🖨️
                      </a>
                      <Link href={`/invoice/${inv.id}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
