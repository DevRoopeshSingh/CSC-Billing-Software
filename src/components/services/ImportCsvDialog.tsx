"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ipc, IpcError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import type { ServicesImportResult } from "@/shared/types";
import { CheckCircle2, FileSpreadsheet, Info, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCommitted: (result: ServicesImportResult) => void;
}

const PRESERVATION_COPY =
  "On existing services, active and bookmarked flags are preserved. " +
  "Rows missing from this CSV will not be deleted.";

const VISIBLE_LIST_CAP = 100;

export function ImportCsvDialog({ open, onClose, onCommitted }: Props) {
  const { toast } = useToast();
  const [csv, setCsv] = useState<string>("");
  const [preview, setPreview] = useState<ServicesImportResult | null>(null);
  const [stage, setStage] = useState<"picking" | "previewing" | "committing">(
    "picking"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setCsv("");
    setPreview(null);
    setStage("picking");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    setCsv(text);
    setStage("previewing");
    try {
      const result = await ipc<ServicesImportResult>(IPC.SERVICES_IMPORT_CSV, {
        csv: text,
        mode: "preview",
      });
      setPreview(result);
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to read CSV",
        "error"
      );
      setStage("picking");
    }
  };

  const commit = async () => {
    setStage("committing");
    try {
      const result = await ipc<ServicesImportResult>(IPC.SERVICES_IMPORT_CSV, {
        csv,
        mode: "commit",
      });
      toast(
        `Imported: +${result.added.length} added, ~${result.updated.length} updated`,
        "success"
      );
      onCommitted(result);
      close();
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Import failed",
        "error"
      );
      setStage("previewing");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={close}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            Import Services from CSV
          </h3>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-1 text-muted-foreground hover:bg-background"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <p>{PRESERVATION_COPY}</p>
          </div>

          {stage === "picking" && (
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                Select a CSV file with the same columns as the seed catalogue.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="text-xs"
              />
            </div>
          )}

          {stage !== "picking" && preview && (
            <div className="space-y-4">
              <SummaryCounts result={preview} />
              <DiffSection
                title="Added"
                tone="add"
                rows={preview.added.map((r) => ({
                  primary: r.name,
                  secondary: `${r.category}${r.subcategory ? ` · ${r.subcategory}` : ""} · ₹${r.defaultPrice}`,
                }))}
              />
              <DiffSection
                title="Updated"
                tone="update"
                rows={preview.updated.map((u) => ({
                  primary: u.after.name,
                  secondary: `₹${Number(u.before.defaultPrice).toFixed(2)} → ₹${u.after.defaultPrice}`,
                }))}
              />
              {preview.skipped.length > 0 && (
                <DiffSection
                  title="Skipped"
                  tone="skip"
                  rows={preview.skipped.map((s) => ({
                    primary: `Row ${s.row}`,
                    secondary: s.reason,
                  }))}
                />
              )}
              {preview.unchanged > 0 && (
                <p className="text-xs text-muted-foreground">
                  {preview.unchanged} row{preview.unchanged === 1 ? "" : "s"}{" "}
                  unchanged.
                </p>
              )}
            </div>
          )}

          {stage === "previewing" && !preview && (
            <p className="text-center text-sm text-muted-foreground">
              Reading file…
            </p>
          )}
        </div>

        <div className="flex justify-between border-t border-border px-6 py-4">
          <p className="text-[11px] text-muted-foreground">
            {stage === "previewing" || stage === "committing"
              ? PRESERVATION_COPY
              : ""}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium hover:bg-background"
            >
              Cancel
            </button>
            {preview && stage !== "committing" && (
              <button
                type="button"
                onClick={commit}
                disabled={
                  preview.added.length === 0 && preview.updated.length === 0
                }
                className={cn(
                  "rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                )}
              >
                <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                Apply Changes
              </button>
            )}
            {stage === "committing" && (
              <button
                type="button"
                disabled
                className="rounded-lg bg-primary/60 px-5 py-2 text-[13px] font-semibold text-white"
              >
                Applying…
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCounts({ result }: { result: ServicesImportResult }) {
  const cells: { label: string; n: number; cls: string }[] = [
    { label: "Added", n: result.added.length, cls: "text-emerald-600" },
    { label: "Updated", n: result.updated.length, cls: "text-amber-600" },
    { label: "Unchanged", n: result.unchanged, cls: "text-muted-foreground" },
    { label: "Skipped", n: result.skipped.length, cls: "text-red-600" },
  ];
  return (
    <div className="grid grid-cols-4 gap-3">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-border bg-card p-3 text-center"
        >
          <p className={cn("text-2xl font-bold", c.cls)}>{c.n}</p>
          <p className="text-[11px] uppercase text-muted-foreground">
            {c.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function DiffSection({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "add" | "update" | "skip";
  rows: { primary: string; secondary: string }[];
}) {
  if (rows.length === 0) return null;
  const visible = rows.slice(0, VISIBLE_LIST_CAP);
  const hidden = rows.length - visible.length;
  const tones: Record<typeof tone, string> = {
    add: "border-emerald-200 bg-emerald-50",
    update: "border-amber-200 bg-amber-50",
    skip: "border-red-200 bg-red-50",
  };
  return (
    <details className={cn("rounded-lg border", tones[tone])} open>
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold">
        {title} ({rows.length})
      </summary>
      <ul className="divide-y divide-border/50 px-3 pb-3">
        {visible.map((r, i) => (
          <li key={i} className="py-1.5 text-xs">
            <p className="font-semibold text-foreground">{r.primary}</p>
            <p className="text-[11px] text-muted-foreground">{r.secondary}</p>
          </li>
        ))}
        {hidden > 0 && (
          <li className="pt-2 text-[11px] italic text-muted-foreground">
            …and {hidden} more (truncated)
          </li>
        )}
      </ul>
    </details>
  );
}
