// src/app/settings/backup/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import { ipc, IpcError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import type { CenterProfile } from "@/shared/types";
import {
  HardDrive,
  Download,
  Upload,
  Clock,
  Shield,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function BackupPage() {
  const { toast } = useToast();
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);
  const [loadingDate, setLoadingDate] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);

  // ── Load last backup timestamp from center profile ────────────────────────
  const loadLastBackup = useCallback(async () => {
    try {
      const profile = await ipc<CenterProfile>(IPC.CENTER_GET);
      setLastBackupDate(
        profile?.lastBackupDate ? new Date(profile.lastBackupDate) : null
      );
    } catch {
      // non-critical — just show "No backup yet"
    } finally {
      setLoadingDate(false);
    }
  }, []);

  useEffect(() => {
    loadLastBackup();
  }, [loadLastBackup]);

  // ── Export Backup ────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await ipc<{ success: boolean; path: string }>(
        IPC.BACKUP_EXPORT
      );

      if (result?.success && result.path) {
        // Stamp the lastBackupDate in the DB so it shows correctly after next load
        const now = new Date();
        await ipc(IPC.CENTER_UPDATE, {
          lastBackupDate: now.toISOString(),
        }).catch(() => {
          /* non-critical */
        });

        setLastBackupDate(now);
        setLastExportPath(result.path);
        toast(`Backup saved to: ${result.path}`, "success");
      }
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Backup export failed",
        "error"
      );
    } finally {
      setExporting(false);
    }
  };

  // ── Import / Restore Backup ──────────────────────────────────────────────
  const handleImport = async () => {
    const confirmed = window.confirm(
      "⚠️ Importing a backup will REPLACE all current data.\n\n" +
        "This cannot be undone. Make sure you have exported a recent backup first.\n\n" +
        "Continue with restore?"
    );
    if (!confirmed) return;

    setImporting(true);
    try {
      const result = await ipc<{
        success: boolean;
        cancelled?: boolean;
        path?: string;
      }>(IPC.BACKUP_IMPORT);

      if (result?.cancelled) {
        // User dismissed the file picker — no action needed
        return;
      }

      if (result?.success) {
        toast(
          "Restore complete! Reloading the app to apply changes…",
          "success"
        );
        // Give the toast a moment to display before the reload wipes the page
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Backup import failed",
        "error"
      );
    } finally {
      setImporting(false);
    }
  };

  const busy = exporting || importing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Backup &amp; Restore
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Protect your billing data with manual and automatic backups.
          </p>
        </div>

        {/* Last backup badge */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium",
            loadingDate
              ? "border-border bg-card text-muted-foreground"
              : lastBackupDate
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
          )}
        >
          {loadingDate ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : lastBackupDate ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          <span>
            {loadingDate
              ? "Checking backup status…"
              : lastBackupDate
                ? `Last backup: ${formatDate(lastBackupDate)}`
                : "No backup taken yet"}
          </span>
        </div>
      </div>

      {/* ── Main action cards ──────────────────────────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Export card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Export Backup</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Save a full copy of your database to{" "}
                <code className="rounded bg-background px-1 text-[11px]">
                  Documents/CSC-Backups/
                </code>
                . Do this before any major change.
              </p>

              {lastExportPath && (
                <p className="mt-2 break-all text-[11px] text-emerald-600">
                  ✓ Saved: {lastExportPath}
                </p>
              )}

              <button
                type="button"
                onClick={handleExport}
                disabled={busy}
                className={cn(
                  "mt-4 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5",
                  "text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark",
                  "disabled:opacity-60"
                )}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {exporting ? "Exporting…" : "Export Now"}
              </button>
            </div>
          </div>
        </div>

        {/* Import card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <Upload className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Import / Restore</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Restore from a previously exported{" "}
                <code className="rounded bg-background px-1 text-[11px]">
                  .db
                </code>{" "}
                file. All current data will be replaced. The app will reload
                automatically.
              </p>

              <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>Export a backup first before importing.</span>
              </div>

              <button
                type="button"
                onClick={handleImport}
                disabled={busy}
                className={cn(
                  "mt-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5",
                  "text-[13px] font-semibold text-amber-800 transition-colors hover:bg-amber-100",
                  "disabled:opacity-60"
                )}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {importing ? "Restoring…" : "Import Backup"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info cards ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Automatic Backups
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A backup is automatically created every time you close the app.
              The last 7 auto-backups are kept in{" "}
              <code className="rounded bg-background px-1">
                Documents/CSC-Backups/
              </code>
              .
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Best Practice
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Export a manual backup to a USB drive or cloud folder (Google
              Drive, Dropbox) at least once a week for off-site protection.
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Moving to a New Machine
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Export a backup on the old machine → install the app on the new
              machine → use Import Backup on the new machine to transfer all
              your data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
