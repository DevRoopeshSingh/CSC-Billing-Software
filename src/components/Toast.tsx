// src/components/Toast.tsx
// Minimal toast system: one provider, useToast() hook, auto-dismiss.
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

const MAX_VISIBLE_TOASTS = 4;
const DEDUP_WINDOW_MS = 6000;

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  count: number;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: (msg: string) => {
        if (typeof window !== "undefined") console.warn("[Toast]", msg);
      },
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  // Track last shown timestamp per (kind|message) for dedup.
  const lastShownRef = useRef<Map<string, number>>(new Map());

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const key = `${kind}|${message}`;
    const now = Date.now();
    const last = lastShownRef.current.get(key) ?? 0;

    // If the same toast fired within the dedup window, just bump the
    // existing entry's counter instead of adding another card.
    if (now - last < DEDUP_WINDOW_MS) {
      setItems((list) => {
        const idx = list.findIndex(
          (t) => t.kind === kind && t.message === message
        );
        if (idx >= 0) {
          const next = list.slice();
          next[idx] = { ...next[idx], count: next[idx].count + 1 };
          return next;
        }
        return list;
      });
      lastShownRef.current.set(key, now);
      return;
    }

    lastShownRef.current.set(key, now);
    const id = ++idRef.current;
    setItems((list) => {
      const next = [...list, { id, kind, message, count: 1 }];
      // Cap visible count by dropping the oldest.
      return next.length > MAX_VISIBLE_TOASTS
        ? next.slice(next.length - MAX_VISIBLE_TOASTS)
        : next;
    });
    setTimeout(() => {
      setItems((list) => list.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) =>
    setItems((list) => list.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {items.map((t) => {
          const Icon =
            t.kind === "success"
              ? CheckCircle2
              : t.kind === "error"
                ? AlertCircle
                : Info;
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md min-w-[280px] max-w-md",
                t.kind === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
                t.kind === "error" && "border-red-200 bg-red-50 text-red-800",
                t.kind === "info" && "border-border bg-card text-foreground"
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1 text-sm font-medium">
                {t.message}
                {t.count > 1 && (
                  <span className="ml-2 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold">
                    ×{t.count}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// Expose a non-hook emitter that components without the hook can use via window.
// Set up by the provider; consumers should prefer useToast().
export function attachGlobalToast(emit: (m: string, k?: ToastKind) => void) {
  if (typeof window !== "undefined") {
    (window as unknown as { __csc_toast?: typeof emit }).__csc_toast = emit;
  }
}
