// src/app/services/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { SERVICE_CATEGORIES } from "@/config/categories";
import { ipc, IpcError, isBridgeMissingError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import { buildCsv, downloadCsv } from "@/lib/csv";
import type {
  Service,
  CenterProfile,
  BulkDeleteServicesResult,
} from "@/shared/types";
import {
  CategorySidebar,
  type SidebarFilter,
} from "@/components/services/CategorySidebar";
import { ServicesTable } from "@/components/services/ServicesTable";
import { BulkActionsBar } from "@/components/services/BulkActionsBar";
import { ServiceEditModal } from "@/components/services/ServiceEditModal";
import { ImportCsvDialog } from "@/components/services/ImportCsvDialog";
import {
  Briefcase,
  Download,
  Plus,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import type { ServicesImportResult } from "@/shared/types";
import { useAuth } from "@/lib/auth-context";
import { PinPromptModal } from "@/components/auth/PinPromptModal";

export default function ServicesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SidebarFilter>({ kind: "All" });
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<Service | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [globalTaxRate, setGlobalTaxRate] = useState(0);
  const [seedBusy, setSeedBusy] = useState(false);
  const [pinModal, setPinModal] = useState<
    | null
    | { kind: "delete-one"; id: number }
    | { kind: "delete-bulk"; ids: number[] }
  >(null);

  const loadServices = useCallback(async () => {
    try {
      const list = await ipc<Service[]>(IPC.SERVICES_LIST);
      setServices(list ?? []);
    } catch (err) {
      // Bridge missing is surfaced once via the global banner — don't toast.
      if (isBridgeMissingError(err)) return;
      toast(
        err instanceof IpcError ? err.message : "Failed to load services",
        "error"
      );
    }
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        const center = await ipc<CenterProfile>(IPC.CENTER_GET);
        setGlobalTaxRate(center?.defaultTaxRate ?? 0);
      } catch {
        /* not configured yet */
      }
      await loadServices();
      setLoading(false);
    })();
  }, [loadServices]);

  // Counts for sidebar — single useMemo over the loaded list (guardrail #2).
  const { countsByCategory, totalActive, totalInactive, totalBookmarked } =
    useMemo(() => {
      const q = search.trim().toLowerCase();
      const matchSearch = (s: Service) => {
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q) ||
          (s.keywords ?? "").toLowerCase().includes(q) ||
          (s.subcategory ?? "").toLowerCase().includes(q) ||
          (s.notes ?? "").toLowerCase().includes(q)
        );
      };
      const counts: Record<string, number> = {};
      let active = 0;
      let inactive = 0;
      let bookmarked = 0;
      for (const s of services) {
        if (!matchSearch(s)) continue;
        if (s.isActive) {
          active++;
          counts[s.category] = (counts[s.category] ?? 0) + 1;
        } else {
          inactive++;
        }
        if (s.isBookmarked && s.isActive) bookmarked++;
      }
      return {
        countsByCategory: counts,
        totalActive: active,
        totalInactive: inactive,
        totalBookmarked: bookmarked,
      };
    }, [services, search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services
      .filter((s) => {
        if (q) {
          const blob = `${s.name} ${s.keywords ?? ""} ${s.subcategory ?? ""} ${s.notes ?? ""}`.toLowerCase();
          if (!blob.includes(q)) return false;
        }
        switch (filter.kind) {
          case "All":
            return s.isActive;
          case "Bookmarked":
            return s.isActive && s.isBookmarked;
          case "Inactive":
            return !s.isActive;
          case "Category":
            return s.isActive && s.category === filter.value;
        }
      })
      .sort((a, b) => {
        // Within a category view, respect sort_order; otherwise alphabetical.
        if (filter.kind === "Category") {
          const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          return so !== 0 ? so : a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [services, search, filter]);

  const visibilityChip = useMemo(() => {
    switch (filter.kind) {
      case "Inactive":
        return "Showing inactive services";
      case "Bookmarked":
        return "Showing active bookmarked services";
      case "Category":
        return `Showing active services in ${filter.value}`;
      default:
        return "Showing active services";
    }
  }, [filter]);

  // Optimistic patch: mutate locally, call backend, rollback on error.
  const patchService = useCallback(
    async (id: number, patch: Partial<Service>) => {
      const before = services.find((s) => s.id === id);
      if (!before) return;
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
      );
      try {
        await ipc(IPC.SERVICES_UPDATE, id, patch);
      } catch (err) {
        setServices((prev) =>
          prev.map((s) => (s.id === id ? before : s))
        );
        if (isBridgeMissingError(err)) return;
        toast(
          err instanceof IpcError ? err.message : "Update failed",
          "error"
        );
      }
    },
    [services, toast]
  );

  const handleDelete = (id: number) => {
    if (
      !confirm(
        "Delete this service? It cannot be deleted if used in invoices."
      )
    )
      return;
    setPinModal({ kind: "delete-one", id });
  };

  const confirmDeleteOne = async (pin: string, id: number) => {
    try {
      await ipc(IPC.SERVICES_DELETE, id, pin);
      setSelection((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadServices();
      toast("Service deleted", "success");
      setPinModal(null);
    } catch (err) {
      throw err instanceof IpcError
        ? err
        : new Error("Cannot delete — service is used in invoices");
    }
  };

  const allSelected =
    filtered.length > 0 && filtered.every((s) => selection.has(s.id!));

  const toggleSelectAll = () => {
    if (allSelected) {
      const visibleIds = new Set(filtered.map((s) => s.id!));
      setSelection((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelection((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.add(s.id!));
        return next;
      });
    }
  };

  const toggleSelect = (id: number) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkPatch = async (patch: { isActive?: boolean; isBookmarked?: boolean }) => {
    const ids = Array.from(selection);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const r = await ipc<{ updated: number }>(IPC.SERVICES_BULK_UPDATE, {
        ids,
        patch,
      });
      toast(`Updated ${r.updated} service${r.updated === 1 ? "" : "s"}`, "success");
      await loadServices();
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Bulk update failed",
        "error"
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = () => {
    const ids = Array.from(selection);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Delete ${ids.length} service${ids.length === 1 ? "" : "s"}? Services already used in invoices will be skipped.`
      )
    )
      return;
    setPinModal({ kind: "delete-bulk", ids });
  };

  const confirmBulkDelete = async (pin: string, ids: number[]) => {
    setBulkBusy(true);
    try {
      const r = await ipc<BulkDeleteServicesResult>(
        IPC.SERVICES_BULK_DELETE,
        { ids },
        pin
      );
      // Remove only deleted ids from selection; leave skipped rows visible
      // and selected for clarity (guardrail #3).
      const skippedSet = new Set(r.skippedInUse);
      setSelection((prev) => {
        const next = new Set<number>();
        for (const id of prev) if (skippedSet.has(id)) next.add(id);
        return next;
      });
      const skippedCount = r.skippedInUse.length;
      if (skippedCount > 0) {
        toast(
          `${r.deleted} deleted, ${skippedCount} skipped because they are already used in invoices.`,
          "info"
        );
      } else {
        toast(`${r.deleted} deleted`, "success");
      }
      await loadServices();
      setPinModal(null);
    } catch (err) {
      throw err instanceof IpcError ? err : new Error("Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const loadSeedCatalogue = async () => {
    if (
      !confirm(
        "Load the bundled CSC seed catalogue?\n\n" +
          "Existing services with the same name + category will have their " +
          "price/tax/keywords updated. Active and bookmarked flags are " +
          "preserved. Nothing will be deleted."
      )
    )
      return;
    setSeedBusy(true);
    try {
      const r = await ipc<ServicesImportResult>(
        IPC.SERVICES_LOAD_SEED_CATALOGUE,
        { mode: "commit" }
      );
      toast(
        `Seed catalogue loaded: +${r.added.length} added, ~${r.updated.length} updated, ${r.unchanged} unchanged.`,
        "success"
      );
      await loadServices();
    } catch (err) {
      toast(
        err instanceof IpcError
          ? err.message
          : "Failed to load seed catalogue",
        "error"
      );
    } finally {
      setSeedBusy(false);
    }
  };

  const exportCsv = () => {
    const { csv } = buildCsv(services, [
      { header: "name", get: (s) => s.name },
      { header: "category", get: (s) => s.category },
      { header: "subcategory", get: (s) => s.subcategory ?? "" },
      { header: "default_price", get: (s) => Number(s.defaultPrice) },
      { header: "tax_rate", get: (s) => Number(s.taxRate) },
      {
        header: "price_is_starting_from",
        get: (s) => (s.priceIsStartingFrom ? "true" : "false"),
      },
      { header: "sort_order", get: (s) => Number(s.sortOrder ?? 0) },
      { header: "keywords", get: (s) => s.keywords ?? "" },
      { header: "notes", get: (s) => s.notes ?? "" },
      { header: "is_active", get: (s) => (s.isActive ? "true" : "false") },
      {
        header: "is_bookmarked",
        get: (s) => (s.isBookmarked ? "true" : "false"),
      },
    ]);
    const ts = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    downloadCsv(`services-${ts}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Services</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the services your center offers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role !== "viewer" && (
            <>
              <button
                type="button"
                onClick={loadSeedCatalogue}
                disabled={seedBusy}
                title="Re-import the bundled CSC seed catalogue"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-semibold hover:bg-background disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {seedBusy ? "Loading..." : "Load Seed"}
              </button>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-semibold hover:bg-background"
              >
                <Upload className="h-3.5 w-3.5" />
                Import CSV
              </button>
            </>
          )}
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-semibold hover:bg-background"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          {user?.role !== "viewer" && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5",
                "text-[13px] font-semibold text-white hover:bg-primary-dark"
              )}
            >
              <Plus className="h-4 w-4" />
              Add Service
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        <CategorySidebar
          filter={filter}
          onChange={(f) => {
            setFilter(f);
            setSelection(new Set());
          }}
          totalActive={totalActive}
          totalInactive={totalInactive}
          totalBookmarked={totalBookmarked}
          countsByCategory={countsByCategory}
        />

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name, keywords, subcategory, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {visibilityChip}
            </span>
          </div>

          {user?.role !== "viewer" && (
            <BulkActionsBar
              selectedCount={selection.size}
              busy={bulkBusy}
              onActivate={() => bulkPatch({ isActive: true })}
              onDeactivate={() => bulkPatch({ isActive: false })}
              onDelete={bulkDelete}
              onClear={() => setSelection(new Set())}
            />
          )}

          {loading ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Loading services...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-10">
              <Briefcase className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search || filter.kind !== "All"
                  ? "No services match your filters"
                  : services.length === 0
                    ? "No services yet."
                    : "No services in this view"}
              </p>
              <div className="flex items-center gap-2">
                {(search || filter.kind !== "All") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setFilter({ kind: "All" });
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-background"
                  >
                    Clear filters
                  </button>
                )}
                {services.length === 0 && (
                  <>
                    <button
                      type="button"
                      onClick={loadSeedCatalogue}
                      disabled={seedBusy}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                    >
                      <Sparkles className="h-3 w-3" />
                      {seedBusy
                        ? "Loading..."
                        : "Load default catalogue"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportOpen(true)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-background"
                    >
                      Import CSV
                    </button>
                  </>
                )}
              </div>
              {services.length > 0 &&
                filter.kind === "Category" &&
                !search && (
                  <p className="text-[11px] text-muted-foreground">
                    Tip: legacy categories from older builds (e.g. &ldquo;Govt
                    Services&rdquo;) won&apos;t appear under the new taxonomy.
                    Use <span className="font-semibold">All</span> to see them
                    and re-categorize.
                  </p>
                )}
            </div>
          ) : (
            <ServicesTable
              services={filtered}
              selection={selection}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              allSelected={allSelected}
              onPatch={patchService}
              onEdit={(s) => {
                setEditing(s);
                setEditorOpen(true);
              }}
              onDelete={handleDelete}
              readOnly={user?.role === "viewer"}
            />
          )}
        </div>
      </div>

      <ServiceEditModal
        open={editorOpen}
        service={editing}
        defaultTaxRate={globalTaxRate}
        onClose={() => setEditorOpen(false)}
        onSaved={loadServices}
      />

      <ImportCsvDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onCommitted={() => {
          loadServices();
        }}
      />

      {pinModal?.kind === "delete-one" && (
        <PinPromptModal
          onConfirm={(pin) => confirmDeleteOne(pin, pinModal.id)}
          onCancel={() => setPinModal(null)}
          title="Delete Service"
          description="Enter Admin PIN to permanently delete this service."
          confirmLabel="Delete"
        />
      )}
      {pinModal?.kind === "delete-bulk" && (
        <PinPromptModal
          onConfirm={(pin) => confirmBulkDelete(pin, pinModal.ids)}
          onCancel={() => setPinModal(null)}
          title="Delete Services"
          description={`Enter Admin PIN to delete ${pinModal.ids.length} service${pinModal.ids.length === 1 ? "" : "s"}. Services already used in invoices will be skipped.`}
          confirmLabel="Delete"
        />
      )}

      {/* Suppress unused-import warnings while keeping references stable. */}
      <noscript className="hidden">{SERVICE_CATEGORIES.length}</noscript>
    </div>
  );
}
