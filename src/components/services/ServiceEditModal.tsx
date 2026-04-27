"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SERVICE_CATEGORIES } from "@/config/categories";
import { ipc, IpcError, isBridgeMissingError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import type { Service, ServiceChecklistItem } from "@/shared/types";
import { X } from "lucide-react";
import { ChecklistEditor, type ChecklistDraftItem } from "./ChecklistEditor";

interface Props {
  open: boolean;
  service: Service | null;
  defaultTaxRate: number;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_FORM = {
  name: "",
  category: "Other Services",
  subcategory: "",
  defaultPrice: 0,
  taxRate: 0,
  priceIsStartingFrom: false,
  sortOrder: 0,
  notes: "",
  isActive: true,
  isBookmarked: false,
  keywords: "",
};

export function ServiceEditModal({
  open,
  service,
  defaultTaxRate,
  onClose,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [checklist, setChecklist] = useState<ChecklistDraftItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (service) {
      setForm({
        name: service.name,
        category: service.category || "Other Services",
        subcategory: service.subcategory ?? "",
        defaultPrice: Number(service.defaultPrice ?? 0),
        taxRate: Number(service.taxRate ?? 0),
        priceIsStartingFrom: Boolean(service.priceIsStartingFrom),
        sortOrder: Number(service.sortOrder ?? 0),
        notes: service.notes ?? "",
        isActive: service.isActive,
        isBookmarked: service.isBookmarked,
        keywords: service.keywords ?? "",
      });
      // Load existing checklist for this service.
      ipc<ServiceChecklistItem[]>(IPC.SERVICE_CHECKLIST_LIST, {
        serviceId: service.id,
      })
        .then((items) =>
          setChecklist(
            (items ?? []).map((i) => ({
              id: i.id,
              documentName: i.documentName,
              isRequired: i.isRequired,
              notes: i.notes ?? "",
            }))
          )
        )
        .catch(() => setChecklist([]));
    } else {
      setForm({ ...EMPTY_FORM, taxRate: defaultTaxRate });
      setChecklist([]);
    }
  }, [open, service, defaultTaxRate]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        defaultPrice: Number(form.defaultPrice),
        taxRate: Number(form.taxRate),
        sortOrder: Math.max(0, Math.trunc(Number(form.sortOrder) || 0)),
      };
      let serviceId: number;
      if (service?.id) {
        await ipc(IPC.SERVICES_UPDATE, service.id, payload);
        serviceId = service.id;
      } else {
        const created = await ipc<Service>(IPC.SERVICES_CREATE, payload);
        if (!created?.id) throw new Error("Service id missing after create");
        serviceId = created.id;
      }

      // Validate checklist drafts before sending — names are required.
      const validItems = checklist
        .map((i, idx) => ({
          id: i.id,
          documentName: i.documentName.trim(),
          isRequired: i.isRequired,
          notes: i.notes,
          sortOrder: idx,
        }))
        .filter((i) => i.documentName.length > 0);

      await ipc(IPC.SERVICE_CHECKLIST_UPSERT_BULK, {
        serviceId,
        items: validItems,
      });

      toast(service ? "Service updated" : "Service added", "success");
      onSaved();
      onClose();
    } catch (err) {
      if (isBridgeMissingError(err)) {
        // Global banner already explains the situation.
        setSaving(false);
        return;
      }
      toast(
        err instanceof IpcError ? err.message : "Failed to save service",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-bold text-foreground">
            {service ? "Edit Service" : "Add New Service"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-background"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Service Name *</Label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Category</Label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className={inputCls}
                >
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Subcategory</Label>
                <input
                  type="text"
                  value={form.subcategory}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subcategory: e.target.value }))
                  }
                  placeholder="e.g. Returns"
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Default Price (₹) *</Label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.defaultPrice}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      defaultPrice: Number(e.target.value),
                    }))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Tax (%)</Label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.taxRate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, taxRate: Number(e.target.value) }))
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sort Order</Label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                  className={inputCls}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Lower numbers appear first inside the category.
                </p>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.priceIsStartingFrom}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        priceIsStartingFrom: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Price is &ldquo;starting from&rdquo; (operator confirms at
                  billing)
                </label>
              </div>
            </div>

            <div>
              <Label>Search Keywords</Label>
              <input
                type="text"
                value={form.keywords}
                onChange={(e) =>
                  setForm((f) => ({ ...f, keywords: e.target.value }))
                }
                placeholder="aliases used by search"
                className={inputCls}
              />
            </div>

            <div>
              <Label>Internal Notes</Label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                placeholder="Operator-only notes (turnaround time, govt fee notes, etc.)"
                className={cn(inputCls, "resize-none")}
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isBookmarked}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      isBookmarked: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Show on Dashboard
              </label>
            </div>

            <div className="border-t border-border pt-4">
              <ChecklistEditor items={checklist} onChange={setChecklist} />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium hover:bg-background"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : service
                  ? "Update Service"
                  : "Add Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = cn(
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
);

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-semibold text-foreground">
      {children}
    </label>
  );
}
