// src/app/customers/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ipc, IpcError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import type { Customer } from "@/shared/types";
import {
  Search,
  UserPlus,
  Users,
  Phone,
  Tag,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";

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

  const loadCustomers = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const list = await ipc<Customer[]>(
          q ? IPC.CUSTOMERS_SEARCH : IPC.CUSTOMERS_LIST,
          q || undefined
        );
        setCustomers(list ?? []);
      } catch (err) {
        toast(
          err instanceof IpcError ? err.message : "Failed to load customers",
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
        await ipc(IPC.CUSTOMERS_CREATE, payload);
        toast("Customer added", "success");
      } else {
        await ipc(IPC.CUSTOMERS_UPDATE, modal.customer.id, payload);
        toast("Customer updated", "success");
      }
      closeModal();
      loadCustomers(search);
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to save customer",
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
    try {
      await ipc(IPC.CUSTOMERS_DELETE, customer.id);
      toast("Customer deleted", "success");
      loadCustomers(search);
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to delete customer",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Customers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading..." : `${customers.length} registered customers`}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/billing/new"
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5",
              "text-[13px] font-medium text-foreground transition-colors hover:bg-background"
            )}
          >
            New Invoice
          </Link>
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
        </div>
      </div>

      <div className="relative max-w-md">
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
          <div className="overflow-x-auto">
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
                          <p className="font-semibold text-foreground">
                            {c.name}
                          </p>
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
                        <span className="flex items-center gap-1.5 text-foreground">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {c.mobile}
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
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
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
                            "inline-flex items-center gap-1 rounded-lg border border-border p-1.5",
                            "text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                          )}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 p-1.5",
                            "text-red-700 transition-colors hover:bg-red-100",
                            "disabled:opacity-50"
                          )}
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
    </div>
  );
}
