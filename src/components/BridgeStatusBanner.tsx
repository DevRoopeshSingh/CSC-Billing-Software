"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { isBridgeAvailable } from "@/lib/ipc";

// Shown only when running outside the Electron desktop app — typically when
// a developer opens the Next dev server in a plain browser tab. Replaces the
// flood of per-call "IPC bridge not available" toasts with a single banner.
export function BridgeStatusBanner() {
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setMissing(!isBridgeAvailable());
  }, []);

  if (!missing) return null;

  return (
    <div className="flex items-center gap-2 border-b border-amber-300 bg-amber-100 px-4 py-2 text-xs text-amber-900">
      <AlertTriangle className="h-3.5 w-3.5 flex-none" />
      <p>
        <span className="font-semibold">Browser preview mode.</span> The IPC
        bridge to the local database is only available inside the desktop app.
        Open this app via Electron (e.g. <code>npm run electron:dev</code>) to
        load services, invoices, and customers.
      </p>
    </div>
  );
}
