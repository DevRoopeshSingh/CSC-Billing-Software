"use client";

import { cn } from "@/lib/utils";
import type { Service } from "@/shared/types";
import {
  Bookmark,
  BookmarkCheck,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { InlineNumberCell } from "./InlineNumberCell";

interface Props {
  services: Service[];
  selection: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  onPatch: (id: number, patch: Partial<Service>) => Promise<void>;
  onEdit: (service: Service) => void;
  onDelete: (id: number) => void;
  readOnly?: boolean;
}

export function ServicesTable({
  services,
  selection,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  onPatch,
  onEdit,
  onDelete,
  readOnly = false,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Mobile Card View */}
      <div className="block md:hidden">
        {services.length > 0 && (
          <div className="flex items-center border-b border-border/50 p-4">
            <label className="flex items-center gap-3 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                disabled={readOnly}
                className="h-5 w-5 rounded border-border accent-primary disabled:opacity-50"
              />
              Select All
            </label>
          </div>
        )}
        <div className="flex flex-col divide-y divide-border/50">
          {services.map((s) => (
            <div key={s.id} className={cn("flex flex-col gap-4 p-4", !s.isActive && "opacity-60")}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selection.has(s.id!)}
                  onChange={() => onToggleSelect(s.id!)}
                  disabled={readOnly}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-border accent-primary disabled:opacity-50"
                />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground text-base leading-tight">{s.name}</p>
                    <button
                      type="button"
                      onClick={() => !readOnly && onPatch(s.id!, { isBookmarked: !s.isBookmarked })}
                      disabled={readOnly}
                      className="inline-flex disabled:opacity-70 p-1 -mt-1 -mr-1"
                    >
                      {s.isBookmarked ? (
                        <BookmarkCheck className="h-5 w-5 text-amber-500" />
                      ) : (
                        <Bookmark className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                      {s.category}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {[s.subcategory, s.keywords].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-lg bg-background p-3">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Price</p>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold">₹</span>
                    <InlineNumberCell
                      value={Number(s.defaultPrice)}
                      format={(n) => n.toFixed(2)}
                      min={0}
                      step={1}
                      ariaLabel={`Edit price for ${s.name}`}
                      onCommit={(n) => onPatch(s.id!, { defaultPrice: n })}
                      readOnly={readOnly}
                    />
                    {s.priceIsStartingFrom && (
                      <span className="rounded-sm bg-amber-100 px-1 text-[10px] font-bold text-amber-700">+</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tax</p>
                  <InlineNumberCell
                    value={Number(s.taxRate)}
                    format={(n) => `${n}%`}
                    min={0}
                    max={100}
                    step={0.5}
                    ariaLabel={`Edit tax for ${s.name}`}
                    onCommit={(n) => onPatch(s.id!, { taxRate: n })}
                    readOnly={readOnly}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => !readOnly && onPatch(s.id!, { isActive: !s.isActive })}
                  disabled={readOnly}
                  className="inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-70 p-2 border border-border rounded-lg bg-background"
                >
                  {s.isActive ? (
                    <>
                      <ToggleRight className="h-4 w-4 text-emerald-500" />
                      <span className="text-emerald-600">Active</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Inactive</span>
                    </>
                  )}
                </button>

                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(s)}
                      className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(s.id!)}
                      className="rounded-lg border border-border p-2 text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
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
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected && services.length > 0}
                  onChange={onToggleSelectAll}
                  disabled={readOnly}
                  className="h-4 w-4 rounded border-border accent-primary disabled:opacity-50"
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Service
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tax
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Active
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bookmark
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr
                key={s.id}
                className={cn(
                  "border-b border-border/50 last:border-0 hover:bg-background/60",
                  !s.isActive && "opacity-60"
                )}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selection.has(s.id!)}
                    onChange={() => onToggleSelect(s.id!)}
                    disabled={readOnly}
                    aria-label={`Select ${s.name}`}
                    className="h-4 w-4 rounded border-border accent-primary disabled:opacity-50"
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-foreground">{s.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[s.subcategory, s.keywords].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {s.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <InlineNumberCell
                      value={Number(s.defaultPrice)}
                      format={(n) => n.toFixed(2)}
                      min={0}
                      step={1}
                      ariaLabel={`Edit price for ${s.name}`}
                      onCommit={(n) => onPatch(s.id!, { defaultPrice: n })}
                      readOnly={readOnly}
                    />
                    {s.priceIsStartingFrom && (
                      <span
                        title="Price is a starting estimate; confirm at billing time"
                        className="ml-0.5 rounded-sm bg-amber-100 px-1 text-[10px] font-bold text-amber-700"
                      >
                        +
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <InlineNumberCell
                      value={Number(s.taxRate)}
                      format={(n) => `${n}%`}
                      min={0}
                      max={100}
                      step={0.5}
                      ariaLabel={`Edit tax for ${s.name}`}
                      onCommit={(n) => onPatch(s.id!, { taxRate: n })}
                      readOnly={readOnly}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => !readOnly && onPatch(s.id!, { isActive: !s.isActive })}
                    disabled={readOnly}
                    title={s.isActive ? "Deactivate" : "Activate"}
                    className="inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-70"
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
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      !readOnly && onPatch(s.id!, { isBookmarked: !s.isBookmarked })
                    }
                    disabled={readOnly}
                    title={s.isBookmarked ? "Remove bookmark" : "Bookmark"}
                    className="inline-flex disabled:opacity-70"
                  >
                    {s.isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Bookmark className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {!readOnly && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(s)}
                          className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-background hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(s.id!)}
                          className="rounded-lg border border-border p-2 text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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
    </div>
  );
}
