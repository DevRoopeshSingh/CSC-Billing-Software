// src/renderer/app/services/page.tsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SERVICE_CATEGORIES } from "@/config/categories";
import {
  Plus,
  Pencil,
  Trash2,
  Briefcase,
  X,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface Service {
  id: number;
  name: string;
  category: string;
  defaultPrice: number;
  taxRate: number;
  isActive: boolean;
  keywords: string;
}

const EMPTY_FORM = {
  name: "",
  category: "Other",
  defaultPrice: 0,
  taxRate: 0,
  isActive: true,
  keywords: "",
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [globalTaxRate, setGlobalTaxRate] = useState(0);

  const loadServices = async () => {
    const res = await fetch("/api/services");
    if (res.ok) setServices(await res.json());
  };

  useEffect(() => {
    const init = async () => {
      try {
        const centerRes = await fetch("/api/center");
        const center = await centerRes.json();
        setGlobalTaxRate(center.defaultTaxRate || 0);
      } catch {}
      await loadServices();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const filtered = services.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.keywords && s.keywords.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = filterCategory === "ALL" || s.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, taxRate: globalTaxRate });
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
      keywords: s.keywords || "",
    });
    setShowModal(true);
  };

  const handleToggle = async (s: Service) => {
    await fetch(`/api/services/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    loadServices();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this service? It cannot be deleted if used in invoices.")) return;
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadServices();
      setToast({ type: "success", text: "Service deleted" });
    } else {
      setToast({ type: "error", text: "Cannot delete — service is used in invoices" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
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
        setToast({ type: "success", text: editingId ? "Service updated" : "Service added" });
      } else {
        setToast({ type: "error", text: "Failed to save service" });
      }
    } finally {
      setSaving(false);
    }
  };

  const categories = ["ALL", ...SERVICE_CATEGORIES];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed right-6 top-20 z-[300] rounded-lg border px-4 py-3 text-sm font-medium shadow-md transition-all",
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          )}
        >
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Services</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the services your center offers
          </p>
        </div>
        <button
          onClick={openAdd}
          className={cn(
            "flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5",
            "text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark"
          )}
        >
          <Plus className="h-4 w-4" />
          Add Service
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={cn(
            "rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "ALL" ? "All Categories" : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading services...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <Briefcase className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search || filterCategory !== "ALL"
                ? "No services match your filters"
                : "No services yet. Add your first service."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Service
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tax
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-b border-border/50 last:border-0 transition-colors hover:bg-background/60",
                      !s.isActive && "opacity-50"
                    )}
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{s.name}</p>
                      {s.keywords && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {s.keywords}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                        {s.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-foreground">
                      ₹{s.defaultPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      {s.taxRate}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggle(s)}
                        title={s.isActive ? "Click to deactivate" : "Click to activate"}
                        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                      >
                        {s.isActive ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-emerald-500" />
                            <span className="text-emerald-600">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                            <span className="text-muted-foreground">Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(s)}
                          className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-bold text-foreground">
                {editingId ? "Edit Service" : "Add New Service"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 px-6 py-5">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Service Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Aadhaar Print"
                      className={cn(
                        "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      )}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className={cn(
                        "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      )}
                    >
                      {SERVICE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Default Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={form.defaultPrice}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, defaultPrice: Number(e.target.value) }))
                      }
                      className={cn(
                        "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      )}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.taxRate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, taxRate: Number(e.target.value) }))
                      }
                      className={cn(
                        "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Search Keywords
                  </label>
                  <input
                    type="text"
                    value={form.keywords}
                    onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                    placeholder="e.g. aadhaar, aadhar, uid"
                    className={cn(
                      "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    )}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Comma-separated aliases for fuzzy search
                  </p>
                </div>

                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground">
                    Active (visible on billing page)
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(
                    "rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white",
                    "hover:bg-primary-dark disabled:opacity-50"
                  )}
                >
                  {saving ? "Saving..." : editingId ? "Update Service" : "Add Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
