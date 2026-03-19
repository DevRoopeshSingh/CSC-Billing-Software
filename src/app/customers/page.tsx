"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Customer } from "@/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch("/api/customers" + qs);
      if (res.ok) {
        setCustomers(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => loadCustomers(), 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div>
      <div className="page-header">
        <h2>Customers Registry</h2>
        <Link href="/billing/new" className="btn btn-primary">
          + New Bill
        </Link>
      </div>

      <div className="card">
        <div style={{ maxWidth: 300, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Search by name or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-muted text-center" style={{ padding: 30 }}>Loading...</p>
        ) : customers.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: 30 }}>No customers found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: "#9ca3af" }}>{c.id}</td>
                    <td style={{ fontWeight: 600 }}>
                      {c.name}
                      {c.remarks && (
                        <span className="badge badge-blue" style={{ marginLeft: "8px", fontSize: "10px" }}>
                          {c.remarks}
                        </span>
                      )}
                    </td>
                    <td>{c.mobile || "—"}</td>
                    <td className="text-right">
                      <Link href={`/customers/${c.id}`} className="btn btn-ghost btn-sm">
                        View History →
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
