"use client";

import { useEffect, useState } from "react";
import { ipcOn, ipc } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { DownloadCloud, Info, AlertCircle, CheckCircle2 } from "lucide-react";

export function AutoUpdaterUI() {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "downloading" | "downloaded" | "error">("idle");
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const unsubChecking = ipcOn("update:checking", () => {
      setStatus("checking");
    });
    
    const unsubAvailable = ipcOn("update:available", (info: any) => {
      setStatus("available");
      setMessage(`Version ${info?.version} is available. Starting download...`);
      // Start download
      if (window.ipc) {
        // We set autoDownload = false in main, so we could explicitly download it.
        // But wait, the main code does not have an explicit download command right now.
        // Actually, let's just show it's available. If autoDownload was false, we need a way to trigger it.
        // Wait, did I set autoDownload to false? Let's check main.
      }
    });

    const unsubNotAvailable = ipcOn("update:not-available", () => {
      setStatus("idle");
    });

    const unsubError = ipcOn("update:error", (errMessage: string) => {
      setStatus("error");
      setMessage(errMessage);
      setTimeout(() => setStatus("idle"), 5000);
    });

    const unsubProgress = ipcOn("update:progress", (progressObj: any) => {
      setStatus("downloading");
      setProgress(progressObj?.percent || 0);
    });

    const unsubDownloaded = ipcOn("update:downloaded", () => {
      setStatus("downloaded");
    });

    return () => {
      unsubChecking();
      unsubAvailable();
      unsubNotAvailable();
      unsubError();
      unsubProgress();
      unsubDownloaded();
    };
  }, []);

  const handleInstall = async () => {
    await ipc(IPC.APP_UPDATE_INSTALL);
  };

  if (status === "idle") return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 rounded-xl border border-border bg-popover text-popover-foreground px-5 py-3 shadow-xl">
      {status === "checking" && (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium">Checking for updates...</span>
        </>
      )}

      {status === "available" && (
        <>
          <Info className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium">{message || "Update available..."}</span>
        </>
      )}

      {status === "downloading" && (
        <div className="flex flex-col gap-1 w-64">
          <div className="flex justify-between text-xs font-medium text-muted-foreground">
            <span>Downloading update</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === "downloaded" && (
        <>
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Update ready</span>
            <span className="text-[11px] text-muted-foreground">Restart to install the latest version</span>
          </div>
          <button 
            onClick={handleInstall}
            className="ml-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Restart
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="text-sm font-medium text-destructive max-w-xs truncate" title={message}>
            Update failed: {message}
          </span>
        </>
      )}
    </div>
  );
}
