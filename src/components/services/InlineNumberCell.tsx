"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  format: (n: number) => string;
  min?: number;
  max?: number;
  step?: number;
  align?: "left" | "right";
  ariaLabel?: string;
  onCommit: (next: number) => Promise<void> | void;
  readOnly?: boolean;
}

export function InlineNumberCell({
  value,
  format,
  min,
  max,
  step,
  align = "right",
  ariaLabel,
  onCommit,
  readOnly = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(value));
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = async () => {
    if (busy) return;
    const n = Number(draft);
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      setEditing(false);
      return;
    }
    if (n === value) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onCommit(n);
    } finally {
      setBusy(false);
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => !readOnly && setEditing(true)}
        disabled={readOnly}
        aria-label={ariaLabel}
        className={cn(
          "w-full rounded px-1 py-0.5 text-sm",
          !readOnly && "hover:bg-background",
          align === "right" ? "text-right" : "text-left"
        )}
      >
        {format(value)}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
      value={draft}
      min={min}
      max={max}
      step={step}
      disabled={busy}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setDraft(String(value));
          setEditing(false);
        }
      }}
      className={cn(
        "w-full rounded border border-primary/40 bg-card px-1 py-0.5 text-sm",
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
        align === "right" ? "text-right" : "text-left"
      )}
    />
  );
}
