"use client";

import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

export interface ChecklistDraftItem {
  id?: number;
  documentName: string;
  isRequired: boolean;
  notes: string;
  // sortOrder is implicit (array index) until save.
}

interface Props {
  items: ChecklistDraftItem[];
  onChange: (next: ChecklistDraftItem[]) => void;
}

export function ChecklistEditor({ items, onChange }: Props) {
  const update = (idx: number, patch: Partial<ChecklistDraftItem>) => {
    const next = items.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const remove = (idx: number) => {
    if (!confirm("Remove this document from the checklist?")) return;
    const next = items.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const add = () => {
    onChange([
      ...items,
      { documentName: "", isRequired: true, notes: "" },
    ]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">
          Required Documents
        </p>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold hover:bg-background"
        >
          <Plus className="h-3 w-3" /> Add document
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No documents listed. Operators won&apos;t see a hint when this service
          is added to an invoice.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, idx) => (
            <li
              key={item.id ?? `new-${idx}`}
              className="flex items-start gap-1.5 rounded-md border border-border bg-card p-1.5"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  title="Move up"
                  className={cn(
                    "rounded p-0.5 text-muted-foreground hover:bg-background",
                    idx === 0 && "opacity-30"
                  )}
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, +1)}
                  disabled={idx === items.length - 1}
                  title="Move down"
                  className={cn(
                    "rounded p-0.5 text-muted-foreground hover:bg-background",
                    idx === items.length - 1 && "opacity-30"
                  )}
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <input
                  type="text"
                  value={item.documentName}
                  onChange={(e) =>
                    update(idx, { documentName: e.target.value })
                  }
                  placeholder="e.g. PAN card"
                  className="rounded border border-border bg-card px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
                <input
                  type="text"
                  value={item.notes}
                  onChange={(e) => update(idx, { notes: e.target.value })}
                  placeholder="Notes (optional)"
                  className="rounded border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <label className="ml-2 flex items-center gap-1.5 text-[11px]">
                <input
                  type="checkbox"
                  checked={item.isRequired}
                  onChange={(e) =>
                    update(idx, { isRequired: e.target.checked })
                  }
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                />
                <span>Required</span>
              </label>
              <button
                type="button"
                onClick={() => remove(idx)}
                title="Remove"
                className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
