"use client";

import { useState, useEffect, useCallback } from "react";

interface FaqEntry {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags: string;
  isPublished: boolean;
  sortOrder: number;
}

const CATEGORIES = ["General", "Services", "Documents", "Timing", "Payment", "Other"];

export default function FaqPage() {
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FaqEntry | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", category: "General", tags: "", isPublished: true });
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (catFilter) params.set("category", catFilter);
    params.set("limit", "100");

    const res = await fetch(`/api/faq?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.data || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [search, catFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const openCreate = () => {
    setEditing(null);
    setForm({ question: "", answer: "", category: "General", tags: "", isPublished: true });
    setShowModal(true);
  };

  const openEdit = (entry: FaqEntry) => {
    setEditing(entry);
    setForm({
      question: entry.question,
      answer: entry.answer,
      category: entry.category,
      tags: entry.tags,
      isPublished: entry.isPublished,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);

    const url = editing ? `/api/faq/${editing.id}` : "/api/faq";
    const method = editing ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    setShowModal(false);
    fetchEntries();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this FAQ entry?")) return;
    await fetch(`/api/faq/${id}`, { method: "DELETE" });
    fetchEntries();
  };

  const togglePublished = async (entry: FaqEntry) => {
    await fetch(`/api/faq/${entry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !entry.isPublished }),
    });
    fetchEntries();
  };

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>FAQ Manager</h2>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
            {total} entries · Knowledge base for the external agent
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add FAQ</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "14px 20px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search questions, answers, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Question</th>
                <th style={{ width: 120 }}>Category</th>
                <th style={{ width: 100 }}>Published</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 40 }}>Loading…</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 40 }}>No FAQ entries yet. Click &ldquo;+ Add FAQ&rdquo; to create one.</td></tr>
              ) : (
                entries.map((entry, i) => (
                  <tr key={entry.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{entry.question}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {entry.answer.length > 80 ? entry.answer.slice(0, 80) + "…" : entry.answer}
                      </div>
                      {entry.tags && (
                        <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {entry.tags.split(",").filter(Boolean).map((tag) => (
                            <span key={tag} className="badge badge-sm badge-gray">{tag.trim()}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td><span className="badge badge-blue">{entry.category}</span></td>
                    <td>
                      <button
                        className={`toggle-switch${entry.isPublished ? " active" : ""}`}
                        onClick={() => togglePublished(entry)}
                        title={entry.isPublished ? "Published" : "Draft"}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(entry)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => handleDelete(entry.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>{editing ? "Edit FAQ Entry" : "New FAQ Entry"}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Question</label>
                <textarea
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder="e.g., What documents do I need for Aadhaar update?"
                  style={{ minHeight: 60 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Answer</label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  placeholder="Full answer text…"
                  style={{ minHeight: 120 }}
                />
              </div>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="aadhaar, update, documents"
                  />
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    type="button"
                    className={`toggle-switch${form.isPublished ? " active" : ""}`}
                    onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
                  />
                  {form.isPublished ? "Published — visible to external agent" : "Draft — hidden from agent"}
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
