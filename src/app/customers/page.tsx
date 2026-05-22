// src/app/customers/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api-client";
import { API } from "@/lib/api-routes";
import { useToast } from "@/components/Toast";
import type { Customer } from "@/shared/types";
import {
  Search,
  UserPlus,
  Users,
  Phone,
  Tag,
  MessageSquare,
  MessageCircle,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import { useCanWrite } from "@/lib/permissions";
import { PinPromptModal } from "@/components/auth/PinPromptModal";

type FormState = {
  name: string;
  mobile: string;
  email: string;
  address: string;
  remarks: string;
  tags: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  remarks: "",
  tags: "",
};

function toForm(c: Customer): FormState {
  return {
    name: c.name ?? "",
    mobile: c.mobile ?? "",
    email: c.email ?? "",
    address: c.address ?? "",
    remarks: c.remarks ?? "",
    tags: c.tags ?? "",
  };
}

export default function CustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState<
    | { mode: "add" }
    | { mode: "edit"; customer: Customer }
    | null
  >(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const canWrite = useCanWrite();

  const loadCustomers = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const list = q
          ? await api.get<Customer[]>(
              `${API.CUSTOMERS_SEARCH}?q=${encodeURIComponent(q)}`
            )
          : await api.get<Customer[]>(API.CUSTOMERS);
        setCustomers(list ?? []);
      } catch (err) {
        toast(
          err instanceof ApiError ? err.message : "Failed to load customers",
          "error"
        );
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    const t = setTimeout(() => loadCustomers(search), 300);
    return () => clearTimeout(t);
  }, [search, loadCustomers]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: "add" });
  };

  const openEdit = (customer: Customer) => {
    setForm(toForm(customer));
    setModal({ mode: "edit", customer });
  };

  const closeModal = () => {
    setModal(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        remarks: form.remarks.trim() || null,
        tags: form.tags.trim(),
      };
      if (modal.mode === "add") {
        await api.post(API.CUSTOMERS, payload);
        toast("Customer added", "success");
      } else if (modal.customer.id) {
        await api.patch(API.CUSTOMER(modal.customer.id), payload);
        toast("Customer updated", "success");
      }
      closeModal();
      loadCustomers(search);
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Failed to save customer",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!customer.id) return;
    if (
      !window.confirm(
        `Delete ${customer.name}? Existing invoices for this customer will be kept but the customer record will be removed.`
      )
    ) {
      return;
    }
    setDeletingId(customer.id);
    setShowPinModal(true);
  };

  const confirmDelete = async (pin: string) => {
    if (!deletingId) return;
    try {
      await api.delete(API.CUSTOMER(deletingId), {
        headers: { "x-admin-pin": pin },
      });
      toast("Customer deleted", "success");
      loadCustomers(search);
      setDeletingId(null);
      setShowPinModal(false);
    } catch (err) {
      // Re-throw so PinPromptModal can show the error and let the user
      // retry without dismissing.
      throw err instanceof ApiError ? err : new Error("Failed to delete customer");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Customers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading..." : `${customers.length} registered customers`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canWrite && (
            <Link
              href="/billing/new"
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5",
                "text-[13px] font-medium text-foreground transition-colors hover:bg-background"
              )}
            >
              New Invoice
            </Link>
          )}
          {canWrite && (
            <button
              onClick={openAdd}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5",
                "text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark"
              )}
            >
              <UserPlus className="h-4 w-4" />
              Add Customer
            </button>
          )}
        </div>
      </div>

      <div className="relative max-w-md w-full">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <Users className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search ? "No customers match your search" : "No customers yet"}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden">
              <div className="flex flex-col divide-y divide-border/50">
                {customers.map((c) => (
                  <div key={c.id} className="flex flex-col gap-3 p-4 hover:bg-background/60 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                            "bg-primary/10 text-base font-semibold text-primary"
                          )}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link 
                            href={`/invoices?customerId=${c.id}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline text-base"
                          >
                            {c.name}
                          </Link>
                          {c.mobile ? (
                            <span className="flex items-center gap-1.5 text-muted-foreground text-sm mt-0.5">
                              <Phone className="h-3.5 w-3.5" />
                              {c.mobile}
                              <a
                                href={`https://wa.me/91${c.mobile.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(c.name)},`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 inline-flex items-center justify-center rounded-full bg-emerald-50 p-1 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                title="Message on WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </a>
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm mt-0.5 block">No mobile</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {c.tags && c.tags.split(",").filter(Boolean).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                          <Tag className="h-2.5 w-2.5" />
                          {tag.trim()}
                        </span>
                      ))}
                      {c.remarks && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          <MessageSquare className="h-2.5 w-2.5" />
                          {c.remarks}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Billed</span>
                        <span className="font-semibold text-emerald-600 text-[13px]">₹{(c.totalBilled ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {canWrite && (
                          <>
                            <Link
                              href={`/billing/new?customerId=${c.id}`}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg border border-border p-2",
                                "text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                              )}
                              title="New Bill"
                            >
                              <FileText className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg border border-border p-2",
                                "text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                              )}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c)}
                              disabled={deletingId === c.id}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 p-2",
                                "text-red-700 transition-colors hover:bg-red-100",
                                "disabled:opacity-50"
                              )}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mobile
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tags / Remarks
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                    Total Invoices
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                    Total Billed
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 last:border-0 hover:bg-background/60 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            "bg-primary/10 text-sm font-semibold text-primary"
                          )}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link 
                            href={`/invoices?customerId=${c.id}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline"
                          >
                            {c.name}
                          </Link>
                          {c.email && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {c.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.mobile ? (
                        <span className="flex items-center gap-2 text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {c.mobile}
                          </span>
                          <a
                            href={`https://wa.me/91${c.mobile.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(c.name)},`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-1 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            title="Message on WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {c.tags &&
                          c.tags
                            .split(",")
                            .filter(Boolean)
                            .map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {tag.trim()}
                              </span>
                            ))}
                        {c.remarks && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            <MessageSquare className="h-2.5 w-2.5" />
                            {c.remarks}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/invoices?customerId=${c.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        <FileText className="h-3 w-3" />
                        {c.invoiceCount ?? 0}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600">
                      ₹{(c.totalBilled ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {canWrite && (
                          <>
                            <Link
                              href={`/billing/new?customerId=${c.id}`}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5",
                                "text-xs font-medium text-foreground transition-colors hover:bg-background"
                              )}
                            >
                              New Bill
                            </Link>
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg border border-border p-2",
                                "text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                              )}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c)}
                              disabled={deletingId === c.id}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 p-2",
                                "text-red-700 transition-colors hover:bg-red-100",
                                "disabled:opacity-50"
                              )}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-bold text-foreground">
                {modal.mode === "add" ? "Add Customer" : "Edit Customer"}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-background"
              >
                Esc
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 px-6 py-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Customer name"
                      className={cn(
                        "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      )}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Mobile
                    </label>
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, mobile: e.target.value }))
                      }
                      placeholder="9876543210"
                      className={cn(
                        "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      )}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="customer@email.com"
                    className={cn(
                      "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Address
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                    placeholder="Full address"
                    className={cn(
                      "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={form.tags}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, tags: e.target.value }))
                      }
                      placeholder="VIP, Regular (comma separated)"
                      className={cn(
                        "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      )}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Remarks
                    </label>
                    <input
                      type="text"
                      value={form.remarks}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, remarks: e.target.value }))
                      }
                      placeholder="Free-form notes"
                      className={cn(
                        "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
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
                  {saving
                    ? "Saving..."
                    : modal.mode === "add"
                      ? "Add Customer"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPinModal && (
        <PinPromptModal
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowPinModal(false);
            setDeletingId(null);
          }}
          title="Delete Customer"
          description="Enter Admin PIN to permanently delete this customer."
          confirmLabel="Delete"
        />
      )}
    </div>
  );
}
