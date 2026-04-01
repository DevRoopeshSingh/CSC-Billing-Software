"use client";

import { useState, useEffect, useCallback } from "react";

interface MessageTemplate {
  id: number;
  name: string;
  channel: string;
  body: string;
  isActive: boolean;
}

const VARIABLES = [
  "{{customerName}}",
  "{{invoiceNo}}",
  "{{total}}",
  "{{status}}",
  "{{centerName}}",
  "{{serviceName}}",
];

const SAMPLE_DATA: Record<string, string> = {
  "{{customerName}}": "Ramesh Kumar",
  "{{invoiceNo}}": "INV-2026-00042",
  "{{total}}": "₹350.00",
  "{{status}}": "PAID",
  "{{centerName}}": "CSC Center",
  "{{serviceName}}": "Aadhaar Print",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [form, setForm] = useState({ name: "", channel: "whatsapp", body: "", isActive: true });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/message-templates");
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", channel: "whatsapp", body: "", isActive: true });
    setShowModal(true);
  };

  const openEdit = (t: MessageTemplate) => {
    setEditing(t);
    setForm({ name: t.name, channel: t.channel, body: t.body, isActive: t.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);

    const url = editing ? `/api/message-templates/${editing.id}` : "/api/message-templates";
    const method = editing ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    setShowModal(false);
    fetchTemplates();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/message-templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  };

  const toggleActive = async (t: MessageTemplate) => {
    await fetch(`/api/message-templates/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    fetchTemplates();
  };

  // Live preview
  const renderPreview = (body: string) => {
    let preview = body;
    for (const [key, value] of Object.entries(SAMPLE_DATA)) {
      preview = preview.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
    }
    return preview;
  };

  const insertVariable = (variable: string) => {
    setForm({ ...form, body: form.body + variable });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Message Templates</h2>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
            WhatsApp & SMS templates with variable placeholders
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Template</button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="card text-center text-muted" style={{ padding: 40 }}>Loading…</div>
      ) : templates.length === 0 ? (
        <div className="card text-center text-muted" style={{ padding: 40 }}>
          No templates yet. Click &ldquo;+ New Template&rdquo; to create one.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {templates.map((t) => (
            <div key={t.id} className="card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{t.name}</h3>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <span className={`badge badge-sm ${t.channel === "whatsapp" ? "badge-green" : t.channel === "sms" ? "badge-blue" : "badge-purple"}`}>
                      {t.channel}
                    </span>
                    <span className={`badge badge-sm ${t.isActive ? "badge-green" : "badge-gray"}`}>
                      {t.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className={`toggle-switch${t.isActive ? " active" : ""}`}
                    onClick={() => toggleActive(t)}
                    title={t.isActive ? "Active" : "Inactive"}
                  />
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => handleDelete(t.id)}>Delete</button>
                </div>
              </div>

              {/* Template Body + Preview */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>Template</p>
                  <pre style={{ fontSize: 13, background: "var(--bg)", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.6, border: "1px solid var(--border)" }}>
                    {t.body}
                  </pre>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>Preview</p>
                  <div style={{ fontSize: 13, background: "#dcf8c6", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.6, border: "1px solid #c8e6b0" }}>
                    {renderPreview(t.body)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>{editing ? "Edit Template" : "New Template"}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label>Template Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Invoice Receipt" />
                </div>
                <div className="form-group">
                  <label>Channel</label>
                  <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              {/* Variables */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ marginBottom: 6, display: "block" }}>Available Variables (click to insert)</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={() => insertVariable(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Message Body</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Hi {{customerName}}, your bill #{{invoiceNo}} of {{total}} is {{status}}. Thank you! — {{centerName}}"
                  style={{ minHeight: 140, fontFamily: "monospace", fontSize: 13 }}
                />
              </div>

              {/* Live Preview */}
              {form.body && (
                <div>
                  <label style={{ marginBottom: 6, display: "block" }}>Live Preview</label>
                  <div style={{ fontSize: 13, background: "#dcf8c6", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.6, border: "1px solid #c8e6b0" }}>
                    {renderPreview(form.body)}
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    type="button"
                    className={`toggle-switch${form.isActive ? " active" : ""}`}
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  />
                  {form.isActive ? "Active" : "Inactive"}
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim() || !form.body.trim()}>
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
