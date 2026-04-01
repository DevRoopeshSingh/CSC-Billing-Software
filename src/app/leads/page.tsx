"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/formatters";

interface Lead {
  id: number;
  name: string;
  mobile: string;
  email: string;
  serviceInterest: string;
  source: string;
  status: string;
  notes: string | null;
  createdAt: string;
  convertedCustomerId: number | null;
}

const STATUS_TABS = ["ALL", "NEW", "CONTACTED", "CONVERTED", "CLOSED"];
const SOURCE_BADGES: Record<string, string> = {
  chatbot: "badge-green",
  whatsapp: "badge-green",
  website: "badge-blue",
  manual: "badge-gray",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", serviceInterest: "", source: "manual", notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (search) params.set("search", search);
    params.set("limit", "100");

    const res = await fetch(`/api/leads?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLeads(data.data || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [status, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ name: "", mobile: "", email: "", serviceInterest: "", source: "manual", notes: "" });
    fetchLeads();
  };

  const handleConvert = async (id: number) => {
    if (!confirm("Convert this lead to a customer?")) return;
    const res = await fetch(`/api/leads/${id}/convert`, { method: "POST" });
    if (res.ok) {
      fetchLeads();
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchLeads();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this lead?")) return;
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    fetchLeads();
  };

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Leads</h2>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
            {total} total leads · Captured from chatbot, walk-ins, and manual entry
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Lead</button>
      </div>

      {/* Status Tabs */}
      <div className="status-tabs">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            className={`status-tab${status === s ? " active" : ""}`}
            onClick={() => setStatus(s)}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by name, mobile, or service interest…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Service Interest</th>
                <th>Source</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-muted" style={{ padding: 40 }}>Loading…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted" style={{ padding: 40 }}>No leads found.</td></tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id}>
                    <td style={{ fontWeight: 500 }}>{lead.name}</td>
                    <td>{lead.mobile || "—"}</td>
                    <td>{lead.serviceInterest || "—"}</td>
                    <td>
                      <span className={`badge badge-sm ${SOURCE_BADGES[lead.source] || "badge-gray"}`}>
                        {lead.source}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-sm ${
                        lead.status === "NEW" ? "badge-blue" :
                        lead.status === "CONTACTED" ? "badge-yellow" :
                        lead.status === "CONVERTED" ? "badge-green" :
                        "badge-gray"
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: 13 }}>
                      {formatDate(lead.createdAt)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {lead.status === "NEW" && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleUpdateStatus(lead.id, "CONTACTED")}>
                            Mark Contacted
                          </button>
                        )}
                        {(lead.status === "NEW" || lead.status === "CONTACTED") && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleConvert(lead.id)}>
                            Convert
                          </button>
                        )}
                        {lead.status !== "CONVERTED" && (
                          <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => handleDelete(lead.id)}>
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Lead</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                </div>
                <div className="form-group">
                  <label>Mobile</label>
                  <input type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="9876543210" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div className="form-group">
                  <label>Service Interest</label>
                  <input type="text" value={form.serviceInterest} onChange={(e) => setForm({ ...form, serviceInterest: e.target.value })} placeholder="e.g., Passport, Aadhaar" />
                </div>
                <div className="form-group">
                  <label>Source</label>
                  <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                    <option value="manual">Manual</option>
                    <option value="chatbot">Chatbot</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="website">Website</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !form.name.trim()}>
                {saving ? "Saving…" : "Create Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
