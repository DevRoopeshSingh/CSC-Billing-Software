"use client";

import { useState, useEffect } from "react";
import { Service } from "@/types";

const EMPTY_FORM = {
  name: "",
  category: "Other",
  defaultPrice: 0,
  taxRate: 0,
  isActive: true,
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadServices = async () => {
    const res = await fetch("/api/services");
    setServices(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      category: s.category || "Other",
      defaultPrice: s.defaultPrice,
      taxRate: s.taxRate,
      isActive: s.isActive,
    });
    setShowModal(true);
  };

  const handleToggleActive = async (s: Service) => {
    await fetch(`/api/services/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    loadServices();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this service?")) return;
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadServices();
    } else {
      alert("Cannot delete — this service is used in invoices.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const url = editingId ? `/api/services/${editingId}` : "/api/services";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          defaultPrice: Number(form.defaultPrice),
          taxRate: Number(form.taxRate),
        }),
      });
      if (res.ok) {
        setShowModal(false);
        loadServices();
        setMessage({ type: "success", text: editingId ? "Service updated!" : "Service added!" });
      } else {
        setMessage({ type: "error", text: "Failed to save service." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Services</h2>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add Service
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p className="text-muted text-center" style={{ padding: 32 }}>Loading…</p>
        ) : services.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: 32 }}>
            No services yet. Click <strong>+ Add Service</strong> to get started.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Service Name</th>
                  <th>Category</th>
                  <th className="text-right">Default Price (₹)</th>
                  <th className="text-right">Tax Rate (%)</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td style={{ color: "#9ca3af", width: 40 }}>{s.id}</td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td><span className="badge badge-blue">{s.category}</span></td>
                    <td className="text-right">₹{s.defaultPrice.toFixed(2)}</td>
                    <td className="text-right">{s.taxRate}%</td>
                    <td className="text-center">
                      <button
                        className={`badge ${s.isActive ? "badge-green" : "badge-red"}`}
                        style={{ cursor: "pointer", border: "none" }}
                        onClick={() => handleToggleActive(s)}
                        title="Click to toggle"
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="text-center">
                      <span className="flex gap-8 items-center" style={{ justifyContent: "center" }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(s)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(s.id)}
                        >
                          Delete
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? "Edit Service" : "Add New Service"}</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid" style={{ gridTemplateColumns: "2fr 1fr", marginBottom: 14 }}>
                  <div className="form-group">
                    <label htmlFor="svcName">Service Name *</label>
                    <input
                      id="svcName"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Aadhaar Print"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="svcCat">Category</label>
                    <select
                      id="svcCat"
                      value={form.category}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    >
                      <option value="Govt Services">Govt Services</option>
                      <option value="Banking">Banking</option>
                      <option value="Education">Education</option>
                      <option value="Utility">Utility</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="form-group">
                    <label htmlFor="svcPrice">Default Price (₹) *</label>
                    <input
                      id="svcPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.defaultPrice}
                      onChange={(e) => setForm((p) => ({ ...p, defaultPrice: Number(e.target.value) }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="svcTax">Tax Rate (%)</label>
                    <input
                      id="svcTax"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.taxRate}
                      onChange={(e) => setForm((p) => ({ ...p, taxRate: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="form-group mt-16" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <input
                    id="svcActive"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                    style={{ width: "auto", cursor: "pointer" }}
                  />
                  <label htmlFor="svcActive" style={{ cursor: "pointer" }}>
                    Active (shown on billing page)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Update Service" : "Add Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
