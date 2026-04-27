"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, EyeOff, Trash2, X } from "lucide-react";

interface Props {
  selectedCount: number;
  busy: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkActionsBar({
  selectedCount,
  busy,
  onActivate,
  onDeactivate,
  onDelete,
  onClear,
}: Props) {
  if (selectedCount === 0) return null;
  return (
    <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-semibold text-primary">
          {selectedCount} selected
        </span>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Action
          onClick={onActivate}
          disabled={busy}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Activate"
        />
        <Action
          onClick={onDeactivate}
          disabled={busy}
          icon={<EyeOff className="h-3.5 w-3.5" />}
          label="Deactivate"
        />
        <Action
          onClick={onDelete}
          disabled={busy}
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label="Delete"
          tone="danger"
        />
      </div>
    </div>
  );
}

function Action({
  onClick,
  disabled,
  icon,
  label,
  tone = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
        tone === "danger"
          ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          : "border-border bg-card text-foreground hover:bg-background"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
