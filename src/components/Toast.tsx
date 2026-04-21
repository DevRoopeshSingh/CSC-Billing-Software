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

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
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

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++idRef.current;
    setItems((list) => [...list, { id, kind, message }]);
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
              <p className="flex-1 text-sm font-medium">{t.message}</p>
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
