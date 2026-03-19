"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatters";

type CustomerHistory = {
  id: number;
  name: string;
  mobile: string;
  invoices: {
    id: number;
    createdAt: string;
    total: number;
    status: string;
    paymentMode: string;
  }[];
};

export default function CustomerHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [customer, setCustomer] = useState<CustomerHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { id } = await params;
        const res = await fetch(`/api/customers/${id}/history`);
        if (res.ok) {
          setCustomer(await res.json());
        } else {
          setError("Customer not found.");
        }
      } catch (e) {
        setError("Failed to load customer history.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params]);

  if (loading) return <p className="text-muted text-center mt-24">Loading history...</p>;
  if (error || !customer) return <p className="alert alert-error mt-24">{error}</p>;

  const totalSpent = customer.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const avgBill = customer.invoices.length ? totalSpent / customer.invoices.length : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{customer.name}</h2>
          <p className="text-muted mt-4">Mobile: {customer.mobile || "N/A"}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", gap: "24px" }}>
            <div>
              <p className="text-muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>Total Spent</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#16a34a" }}>
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>Avg Bill</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#4b5563" }}>
                {formatCurrency(avgBill)}
              </p>
            </div>
          </div>
          <Link href={`/billing/new?customerId=${customer.id}`} className="btn btn-primary btn-sm mt-8">
            + New Bill for Customer
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <h3 style={{ padding: "20px 24px", fontSize: 16, fontWeight: 600, borderBottom: "1px solid #e5e7eb", margin: 0 }}>
          Billing History ({customer.invoices.length} invoices)
        </h3>
        
        {customer.invoices.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: 40 }}>No invoices found for this customer.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Payment Mode</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {customer.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600, color: "#4b5563" }}>
                      INV-{String(inv.id).padStart(4, "0")}
                    </td>
                    <td>{formatDate(inv.createdAt)}</td>
                    <td>
                      <span className={`badge ${inv.status === "PAID" ? "badge-green" : inv.status === "CANCELLED" ? "badge-red" : "badge-blue"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>{inv.paymentMode}</td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="text-center">
                      <Link href={`/invoice/${inv.id}`} className="btn btn-ghost btn-sm">
                        View Receipt
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
