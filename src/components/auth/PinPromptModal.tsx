"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Loader2, Key } from "lucide-react";

// The modal collects a PIN and hands it to the caller via onConfirm. The PIN
// is no longer verified by a standalone IPC: the destructive operation
// itself takes the PIN and re-verifies it server-side, atomically. This
// closes the "verified the PIN, then called the unprotected delete" gap.

interface PinPromptModalProps {
  onConfirm: (pin: string) => Promise<void>;
  onCancel: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export function PinPromptModal({
  onConfirm,
  onCancel,
  title = "Admin PIN Required",
  description = "Please enter the global Admin PIN to authorize this action.",
  confirmLabel = "Authorize",
}: PinPromptModalProps) {
  const { toast } = useToast();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return;

    setLoading(true);
    try {
      await onConfirm(pin);
    } catch (err: any) {
      toast(err?.message || "Action failed", "error");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl border border-border">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <Key className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">{description}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              required
              autoFocus
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-xl tracking-widest focus:border-primary focus:outline-none"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="••••"
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
